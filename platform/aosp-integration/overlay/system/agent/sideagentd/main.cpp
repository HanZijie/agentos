#include <android/binder_manager.h>
#include <android/binder_process.h>
#include <android/binder_stability.h>
#include <android/binder_ibinder.h>
#include <android-base/logging.h>

#include <algorithm>
#include <chrono>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include "aidl/com/example/agentos/AgentHealth.h"
#include "aidl/com/example/agentos/AgentPluginInvokeRequest.h"
#include "aidl/com/example/agentos/AgentPluginInvokeResult.h"
#include "aidl/com/example/agentos/AgentPluginResourceRequest.h"
#include "aidl/com/example/agentos/AgentPluginSession.h"
#include "aidl/com/example/agentos/BnSideagentd.h"
#include "aidl/com/example/agentos/IAgentPluginEndpoint.h"
#include "aidl/com/example/agentos/IAgentPluginResultSink.h"

using aidl::com::example::agentos::AgentHealth;
using aidl::com::example::agentos::AgentPluginInvokeRequest;
using aidl::com::example::agentos::AgentPluginInvokeResult;
using aidl::com::example::agentos::AgentPluginResourceRequest;
using aidl::com::example::agentos::AgentPluginSession;
using aidl::com::example::agentos::BnSideagentd;
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
  Sideagentd() : started_at_ms_(NowMs()) {}

  ScopedAStatus getHealth(AgentHealth* out) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (out == nullptr) return ScopedAStatus::fromExceptionCode(EX_NULL_POINTER);
    std::lock_guard<std::mutex> guard(lock_);
    out->protocolVersion = 1;
    out->state = "ready";
    out->startedAtMs = started_at_ms_;
    out->activeSessions = static_cast<int32_t>(sessions_.size());
    out->queuedTasks = 0;
    return ScopedAStatus::ok();
  }

  ScopedAStatus registerPluginSession(const AgentPluginSession& session) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    if (session.pluginSessionId.empty() || session.pluginId.empty() ||
        session.packageName.empty() || session.endpoint == nullptr) {
      return ScopedAStatus::fromExceptionCode(EX_ILLEGAL_ARGUMENT);
    }
    std::lock_guard<std::mutex> guard(lock_);
    sessions_[session.pluginSessionId] = Session{
        session.userId, session.pluginId, session.packageName, session.grantedTools,
        session.grantedResources, session.endpoint};
    return ScopedAStatus::ok();
  }

  ScopedAStatus unregisterPluginSession(const std::string& plugin_session_id,
                                        const std::string& /*reason*/) override {
    if (!AuthorizedCaller()) return ScopedAStatus::fromExceptionCode(EX_SECURITY);
    std::lock_guard<std::mutex> guard(lock_);
    sessions_.erase(plugin_session_id);
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
      auto session = sessions_.find(request.pluginSessionId);
      if (session == sessions_.end())
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
      auto session = sessions_.find(request.pluginSessionId);
      if (session == sessions_.end())
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
      auto session = sessions_.find(plugin_session_id);
      if (session == sessions_.end()) return ScopedAStatus::ok();
      endpoint = session->second.endpoint;
      requests_.erase(plugin_session_id + "\n" + request_id);
    }
    return endpoint->cancelInvoke(plugin_session_id, request_id);
  }

 private:
  struct Session {
    int32_t user_id;
    std::string plugin_id;
    std::string package_name;
    std::vector<std::string> tools;
    std::vector<std::string> resources;
    std::shared_ptr<IAgentPluginEndpoint> endpoint;
  };

  static int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
  }

  const int64_t started_at_ms_;
  std::mutex lock_;
  std::unordered_map<std::string, Session> sessions_;
  std::unordered_set<std::string> requests_;
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
