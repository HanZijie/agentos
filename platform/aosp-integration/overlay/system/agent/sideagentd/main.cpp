#include <android/binder_manager.h>
#include <android/binder_process.h>
#include <android/binder_stability.h>
#include <android/binder_ibinder.h>
#include <android-base/logging.h>

#include <algorithm>
#include <chrono>
#include <memory>
#include <mutex>
#include <random>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include "aidl/com/example/agentos/AgentHealth.h"
#include "aidl/com/example/agentos/AgentEnqueueResult.h"
#include "aidl/com/example/agentos/AgentPluginInvokeRequest.h"
#include "aidl/com/example/agentos/AgentPluginInvokeResult.h"
#include "aidl/com/example/agentos/AgentPluginResourceRequest.h"
#include "aidl/com/example/agentos/AgentPluginSession.h"
#include "aidl/com/example/agentos/AgentSessionSnapshot.h"
#include "aidl/com/example/agentos/BnSideagentd.h"
#include "aidl/com/example/agentos/IAgentEventCallback.h"
#include "aidl/com/example/agentos/IAgentPluginEndpoint.h"
#include "aidl/com/example/agentos/IAgentPluginResultSink.h"

using aidl::com::example::agentos::AgentHealth;
using aidl::com::example::agentos::AgentEnqueueResult;
using aidl::com::example::agentos::AgentPluginInvokeRequest;
using aidl::com::example::agentos::AgentPluginInvokeResult;
using aidl::com::example::agentos::AgentPluginResourceRequest;
using aidl::com::example::agentos::AgentPluginSession;
using aidl::com::example::agentos::AgentSessionSnapshot;
using aidl::com::example::agentos::BnSideagentd;
using aidl::com::example::agentos::IAgentEventCallback;
using aidl::com::example::agentos::IAgentPluginEndpoint;
using aidl::com::example::agentos::IAgentPluginResultSink;
using ndk::ScopedAStatus;

namespace {

bool AuthorizedCaller() {
  const uid_t caller = AIBinder_getCallingUid();
  return caller == 0 || caller == 1000;
}

bool Contains(const std::vector<std::string>& values, const std::string& value) {
  return std::find(values.begin(), values.end(), value) != values.end();
}

std::string JsonString(const std::string& value) {
  std::string result = "\"";
  for (unsigned char ch : value) {
    switch (ch) {
      case '\\': result += "\\\\"; break;
      case '"': result += "\\\""; break;
      case '\n': result += "\\n"; break;
      case '\r': result += "\\r"; break;
      case '\t': result += "\\t"; break;
      default:
        if (ch < 0x20) {
          const char* hex = "0123456789abcdef";
          result += "\\u00";
          result += hex[ch >> 4];
          result += hex[ch & 15];
        } else {
          result += static_cast<char>(ch);
        }
    }
  }
  result += "\"";
  return result;
}

ScopedAStatus DeliverError(const std::shared_ptr<IAgentPluginResultSink>& sink,
                          const std::string& request_id, const std::string& code,
                          const std::string& message, bool retryable = false) {
  if (sink) {
    AgentPluginInvokeResult result;
    result.requestId = request_id;
    result.status = "error";
    result.error.code = code;
    result.error.message = message;
    result.error.retryable = retryable;
    result.error.dataJson = "";
    sink->onResult(result);
  }
  return ScopedAStatus::ok();
}

class Sideagentd final : public BnSideagentd {
 public:
  Sideagentd() : started_at_ms_(NowMs()), random_(std::random_device{}()) {}

  ScopedAStatus getHealth(AgentHealth* out) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (out == nullptr) return ScopedAStatus::fromExceptionCode(EX_NULL_POINTER);
    std::lock_guard<std::mutex> guard(lock_);
    out->protocolVersion = 1;
    out->state = "ready";
    out->startedAtMs = started_at_ms_;
    out->activeSessions = static_cast<int32_t>(agent_sessions_.size());
    out->queuedTasks = static_cast<int32_t>(queued_tasks_);
    return ScopedAStatus::ok();
  }

  ScopedAStatus registerPluginSession(const AgentPluginSession& session) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (session.pluginSessionId.empty() || session.pluginId.empty() ||
        session.packageName.empty() || session.endpoint == nullptr) {
      return ScopedAStatus::fromExceptionCode(EX_ILLEGAL_ARGUMENT);
    }
    std::lock_guard<std::mutex> guard(lock_);
    plugin_sessions_[session.pluginSessionId] = PluginSession{
        session.userId, session.pluginId, session.packageName, session.grantedTools,
        session.grantedResources, session.endpoint};
    return ScopedAStatus::ok();
  }

  ScopedAStatus unregisterPluginSession(const std::string& plugin_session_id,
                                        const std::string& /*reason*/) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    std::lock_guard<std::mutex> guard(lock_);
    plugin_sessions_.erase(plugin_session_id);
    const std::string prefix = plugin_session_id + "\n";
    for (auto it = requests_.begin(); it != requests_.end();) {
      if (it->rfind(prefix, 0) == 0) it = requests_.erase(it);
      else ++it;
    }
    return ScopedAStatus::ok();
  }

  ScopedAStatus beginInvoke(const AgentPluginInvokeRequest& request,
                            const std::shared_ptr<IAgentPluginResultSink>& sink) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (request.requestId.empty() || request.tool.empty() || request.pluginSessionId.empty())
      return DeliverError(sink, request.requestId, "invalid_request", "request fields are required");
    if (request.deadlineEpochMs <= NowMs())
      return DeliverError(sink, request.requestId, "timeout", "deadline has elapsed");
    std::shared_ptr<IAgentPluginEndpoint> endpoint;
    const std::string request_key = request.pluginSessionId + "\n" + request.requestId;
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = plugin_sessions_.find(request.pluginSessionId);
      if (session == plugin_sessions_.end())
        return DeliverError(sink, request.requestId, "unavailable", "Plugin session is not registered", true);
      if (!Contains(session->second.tools, request.tool))
        return DeliverError(sink, request.requestId, "unknown_tool", "tool is not granted");
      if (!requests_.emplace(request_key).second)
        return DeliverError(sink, request.requestId, "invalid_request", "duplicate request id");
      endpoint = session->second.endpoint;
    }
    const ScopedAStatus status = endpoint->beginInvoke(request, sink);
    if (!status.isOk()) {
      std::lock_guard<std::mutex> guard(lock_);
      requests_.erase(request_key);
      return DeliverError(sink, request.requestId, "unavailable", "Plugin endpoint rejected invoke", true);
    }
    return ScopedAStatus::ok();
  }

  ScopedAStatus beginReadResource(const AgentPluginResourceRequest& request,
                                  const std::shared_ptr<IAgentPluginResultSink>& sink) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (request.requestId.empty() || request.resource.empty() || request.pluginSessionId.empty())
      return DeliverError(sink, request.requestId, "invalid_request", "request fields are required");
    if (request.deadlineEpochMs <= NowMs() || request.maxBytes <= 0)
      return DeliverError(sink, request.requestId, "invalid_request", "invalid resource deadline or size");
    std::shared_ptr<IAgentPluginEndpoint> endpoint;
    const std::string request_key = request.pluginSessionId + "\n" + request.requestId;
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = plugin_sessions_.find(request.pluginSessionId);
      if (session == plugin_sessions_.end())
        return DeliverError(sink, request.requestId, "unavailable", "Plugin session is not registered", true);
      if (!Contains(session->second.resources, request.resource))
        return DeliverError(sink, request.requestId, "unknown_resource", "resource is not granted");
      if (!requests_.emplace(request_key).second)
        return DeliverError(sink, request.requestId, "invalid_request", "duplicate request id");
      endpoint = session->second.endpoint;
    }
    const ScopedAStatus status = endpoint->beginReadResource(request, sink);
    if (!status.isOk()) {
      std::lock_guard<std::mutex> guard(lock_);
      requests_.erase(request_key);
      return DeliverError(sink, request.requestId, "unavailable", "Plugin endpoint rejected resource read", true);
    }
    return ScopedAStatus::ok();
  }

  ScopedAStatus cancelInvoke(const std::string& plugin_session_id,
                             const std::string& request_id) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    std::shared_ptr<IAgentPluginEndpoint> endpoint;
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = plugin_sessions_.find(plugin_session_id);
      if (session == plugin_sessions_.end()) return ScopedAStatus::ok();
      endpoint = session->second.endpoint;
      requests_.erase(plugin_session_id + "\n" + request_id);
    }
    return endpoint->cancelInvoke(plugin_session_id, request_id);
  }

  ScopedAStatus createSession(int32_t user_id, int32_t frontend_uid,
                              const std::string& frontend_id,
                              const std::string& metadata_json,
                              std::string* out_session_id) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (out_session_id == nullptr || frontend_id.empty() || frontend_id.size() > 128)
      return ScopedAStatus::fromExceptionCode(EX_ILLEGAL_ARGUMENT);
    AgentSession session;
    session.user_id = user_id;
    session.owner_uid = frontend_uid;
    session.frontend_id = frontend_id;
    session.metadata_json = metadata_json.empty() ? "{}" : metadata_json;
    std::string id;
    {
      std::lock_guard<std::mutex> guard(lock_);
      id = "session-" + std::to_string(random_()) + "-" + std::to_string(random_());
      agent_sessions_.emplace(id, std::move(session));
    }
    *out_session_id = id;
    return ScopedAStatus::ok();
  }

  ScopedAStatus submitInput(int32_t user_id, int32_t frontend_uid,
                            const std::string& session_id,
                            const std::string& request_id, const std::string& content_json,
                            AgentEnqueueResult* out_result) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (out_result == nullptr || session_id.empty() || request_id.empty() || content_json.empty())
      return ScopedAStatus::fromExceptionCode(EX_ILLEGAL_ARGUMENT);
    AgentEnqueueResult result;
    result.accepted = false;
    result.sessionId = session_id;
    result.taskId = "";
    result.messageId = "";
    result.deduplicated = false;
    result.errorCode = "";
    result.errorMessage = "";
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = agent_sessions_.find(session_id);
      if (session == agent_sessions_.end() || session->second.user_id != user_id
          || session->second.owner_uid != frontend_uid) {
        result.errorCode = "session_not_found";
        result.errorMessage = "Agent session is not available";
        *out_result = result;
        return ScopedAStatus::ok();
      }
      auto existing = session->second.requests.find(request_id);
      if (existing != session->second.requests.end()) {
        result.accepted = true;
        result.deduplicated = true;
        result.taskId = existing->second.task_id;
        result.messageId = existing->second.message_id;
        *out_result = result;
        return ScopedAStatus::ok();
      }
      const std::string task_id = "task-" + std::to_string(++next_task_id_);
      const std::string message_id = "message-" + std::to_string(++next_message_id_);
      session->second.requests.emplace(request_id, Request{task_id, message_id, false});
      ++queued_tasks_;
      result.accepted = true;
      result.taskId = task_id;
      result.messageId = message_id;
    }
    *out_result = result;
    Emit(session_id, "{\"eventType\":\"task.queued\",\"requestId\":" +
                      JsonString(request_id) + ",\"taskId\":" + JsonString(result.taskId) + "}");
    Emit(session_id, "{\"eventType\":\"task.failed\",\"requestId\":" +
                      JsonString(request_id) + ",\"taskId\":" + JsonString(result.taskId) +
                      ",\"error\":{\"code\":\"runtime_unavailable\",\"retryable\":true,\"message\":\"Agent runtime is not packaged in this image\"},\"content\":" +
                      JsonString(content_json) + "}");
    {
      std::lock_guard<std::mutex> guard(lock_);
      if (queued_tasks_ > 0) --queued_tasks_;
      auto session = agent_sessions_.find(session_id);
      if (session != agent_sessions_.end()) {
        auto request = session->second.requests.find(request_id);
        if (request != session->second.requests.end()) request->second.terminal = true;
      }
    }
    return ScopedAStatus::ok();
  }

  ScopedAStatus subscribeOutput(int32_t user_id, int32_t frontend_uid,
                                const std::string& session_id,
                                int64_t after_sequence,
                                const std::shared_ptr<IAgentEventCallback>& callback) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (callback == nullptr) return ScopedAStatus::fromExceptionCode(EX_NULL_POINTER);
    std::vector<Event> replay;
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = agent_sessions_.find(session_id);
      if (session == agent_sessions_.end() || session->second.user_id != user_id
          || session->second.owner_uid != frontend_uid)
        return ScopedAStatus::fromExceptionCode(EX_SECURITY);
      session->second.subscribers.push_back(callback);
      for (const auto& event : session->second.events)
        if (event.sequence > after_sequence) replay.push_back(event);
    }
    for (const auto& event : replay) callback->onEvent(session_id, event.sequence, event.json);
    return ScopedAStatus::ok();
  }

  ScopedAStatus unsubscribeOutput(int32_t user_id, int32_t frontend_uid,
                                  const std::string& session_id,
                                  const std::shared_ptr<IAgentEventCallback>& callback) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (callback == nullptr) return ScopedAStatus::ok();
    std::lock_guard<std::mutex> guard(lock_);
    auto session = agent_sessions_.find(session_id);
    if (session == agent_sessions_.end() || session->second.user_id != user_id
        || session->second.owner_uid != frontend_uid)
      return ScopedAStatus::ok();
    session->second.subscribers.erase(
        std::remove_if(session->second.subscribers.begin(), session->second.subscribers.end(),
                       [&](const auto& item) { return item.get() == callback.get(); }),
        session->second.subscribers.end());
    return ScopedAStatus::ok();
  }

  ScopedAStatus cancelTask(int32_t user_id, int32_t frontend_uid,
                           const std::string& session_id,
                           const std::string& request_id) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    bool emit = false;
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = agent_sessions_.find(session_id);
      if (session == agent_sessions_.end() || session->second.user_id != user_id
          || session->second.owner_uid != frontend_uid)
        return ScopedAStatus::ok();
      auto request = session->second.requests.find(request_id);
      if (request != session->second.requests.end() && !request->second.terminal) {
        request->second.terminal = true;
        emit = true;
      }
    }
    if (emit) Emit(session_id, "{\"eventType\":\"task.cancelled\",\"requestId\":" +
                              JsonString(request_id) + "}");
    return ScopedAStatus::ok();
  }

  ScopedAStatus getSnapshot(int32_t user_id, int32_t frontend_uid,
                            const std::string& session_id,
                            AgentSessionSnapshot* out_snapshot) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (out_snapshot == nullptr) return ScopedAStatus::fromExceptionCode(EX_NULL_POINTER);
    std::lock_guard<std::mutex> guard(lock_);
    auto session = agent_sessions_.find(session_id);
    if (session == agent_sessions_.end() || session->second.user_id != user_id
        || session->second.owner_uid != frontend_uid)
      return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    out_snapshot->sessionId = session_id;
    out_snapshot->currentSequence = session->second.sequence;
    out_snapshot->json = "{\"sessionId\":" + JsonString(session_id) +
                          ",\"frontendId\":" + JsonString(session->second.frontend_id) +
                          ",\"currentSequence\":" + std::to_string(session->second.sequence) +
                          ",\"runtime\":\"unavailable\"}";
    return ScopedAStatus::ok();
  }

 private:
  struct PluginSession {
    int32_t user_id;
    std::string plugin_id;
    std::string package_name;
    std::vector<std::string> tools;
    std::vector<std::string> resources;
    std::shared_ptr<IAgentPluginEndpoint> endpoint;
  };

  struct Request {
    std::string task_id;
    std::string message_id;
    bool terminal;
  };

  struct Event {
    int64_t sequence;
    std::string json;
  };

  struct AgentSession {
    int32_t user_id;
    int32_t owner_uid;
    std::string frontend_id;
    std::string metadata_json;
    int64_t sequence = 0;
    std::vector<Event> events;
    std::unordered_map<std::string, Request> requests;
    std::vector<std::shared_ptr<IAgentEventCallback>> subscribers;
  };

  void Emit(const std::string& session_id, const std::string& event_json) {
    std::vector<std::shared_ptr<IAgentEventCallback>> subscribers;
    int64_t sequence = 0;
    {
      std::lock_guard<std::mutex> guard(lock_);
      auto session = agent_sessions_.find(session_id);
      if (session == agent_sessions_.end()) return;
      sequence = ++session->second.sequence;
      session->second.events.push_back(Event{sequence, event_json});
      if (session->second.events.size() > 256) session->second.events.erase(session->second.events.begin());
      subscribers = session->second.subscribers;
    }
    for (const auto& subscriber : subscribers) {
      if (subscriber) subscriber->onEvent(session_id, sequence, event_json);
    }
  }

  static int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
  }

  const int64_t started_at_ms_;
  std::mutex lock_;
  std::unordered_map<std::string, PluginSession> plugin_sessions_;
  std::unordered_set<std::string> requests_;
  std::unordered_map<std::string, AgentSession> agent_sessions_;
  std::mt19937_64 random_;
  uint64_t next_task_id_ = 0;
  uint64_t next_message_id_ = 0;
  uint64_t queued_tasks_ = 0;
};

}  // namespace

int main() {
  android::base::InitLogging(nullptr);
  ABinderProcess_setThreadPoolMaxThreadCount(4);

  auto service = ndk::SharedRefBase::make<Sideagentd>();
  auto binder = service->asBinder();
  AIBinder_forceDowngradeToSystemStability(binder.get());
  const binder_status_t status =
      AServiceManager_addService(binder.get(), "agentos.sideagentd");
  if (status != STATUS_OK) {
    LOG(ERROR) << "Unable to publish agentos.sideagentd: " << status;
    return 1;
  }

  LOG(INFO) << "sideagentd health and Plugin session service ready";
  ABinderProcess_startThreadPool();
  ABinderProcess_joinThreadPool();
  return 0;
}
