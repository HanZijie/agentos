#include "runtime_worker.h"

#include "secret_store.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <sstream>

namespace agentos {
namespace {

std::string JsonEscape(const std::string& value) {
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
          result.push_back(static_cast<char>(ch));
        }
    }
  }
  result.push_back('"');
  return result;
}

bool ReadJsonStringAt(const std::string& source, size_t quote, std::string* out,
                      size_t* end) {
  if (quote >= source.size() || source[quote] != '"') return false;
  std::string result;
  for (size_t index = quote + 1; index < source.size(); ++index) {
    const char c = source[index];
    if (c == '"') {
      if (out) *out = result;
      if (end) *end = index + 1;
      return true;
    }
    if (c != '\\') { result.push_back(c); continue; }
    if (++index >= source.size()) return false;
    switch (source[index]) {
      case '"': result.push_back('"'); break;
      case '\\': result.push_back('\\'); break;
      case '/': result.push_back('/'); break;
      case 'b': result.push_back('\b'); break;
      case 'f': result.push_back('\f'); break;
      case 'n': result.push_back('\n'); break;
      case 'r': result.push_back('\r'); break;
      case 't': result.push_back('\t'); break;
      case 'u': {
        if (index + 4 >= source.size()) return false;
        unsigned value = 0;
        for (size_t digit = 1; digit <= 4; ++digit) {
          const char h = source[index + digit];
          value <<= 4;
          if (h >= '0' && h <= '9') value += h - '0';
          else if (h >= 'a' && h <= 'f') value += h - 'a' + 10;
          else if (h >= 'A' && h <= 'F') value += h - 'A' + 10;
          else return false;
        }
        // API prompts are UTF-8. Keep non-ASCII escapes as UTF-8 rather than
        // leaking a lossy byte into the model request.
        if (value <= 0x7f) result.push_back(static_cast<char>(value));
        else if (value <= 0x7ff) {
          result.push_back(static_cast<char>(0xc0 | (value >> 6)));
          result.push_back(static_cast<char>(0x80 | (value & 0x3f)));
        } else {
          result.push_back(static_cast<char>(0xe0 | (value >> 12)));
          result.push_back(static_cast<char>(0x80 | ((value >> 6) & 0x3f)));
          result.push_back(static_cast<char>(0x80 | (value & 0x3f)));
        }
        index += 4;
        break;
      }
      default: return false;
    }
  }
  return false;
}

std::string FindStringValues(const std::string& source, const std::string& key,
                             bool all) {
  std::string result;
  std::string needle = "\"" + key + "\"";
  size_t cursor = 0;
  while ((cursor = source.find(needle, cursor)) != std::string::npos) {
    size_t colon = source.find(':', cursor + needle.size());
    if (colon == std::string::npos) break;
    size_t quote = colon + 1;
    while (quote < source.size() && std::isspace(static_cast<unsigned char>(source[quote]))) ++quote;
    std::string value;
    size_t end = 0;
    if (ReadJsonStringAt(source, quote, &value, &end)) {
      if (!result.empty()) result.push_back('\n');
      result += value;
      if (!all) break;
      cursor = end;
    } else {
      cursor += needle.size();
    }
  }
  return result;
}

std::string PromptText(const std::string& content_json) {
  // The frontend's stable content envelope contains text blocks.  Reading
  // only string fields named "text" keeps images and opaque metadata out of
  // the MiniMax request while preserving multiple text blocks.
  return FindStringValues(content_json, "text", true);
}

std::string MetadataString(const std::string& metadata, const std::string& key) {
  return FindStringValues(metadata, key, false);
}

std::string ErrorCodeForHttp(const HttpResponse& response) {
  if (response.status == 401 || response.status == 403) return "runtime_auth_failed";
  if (response.status == 408 || response.status == 429 || response.status >= 500) return "runtime_retryable";
  return response.status == 0 ? "runtime_network_error" : "runtime_http_error";
}

}  // namespace

NativeRuntimeWorker::NativeRuntimeWorker(RuntimeEventCallback callback)
    : callback_(std::move(callback)) {}

NativeRuntimeWorker::~NativeRuntimeWorker() { Stop(); }

void NativeRuntimeWorker::Start() {
  std::lock_guard<std::mutex> guard(lock_);
  if (started_) return;
  started_ = true;
  stopping_ = false;
  thread_ = std::thread(&NativeRuntimeWorker::Loop, this);
}

bool NativeRuntimeWorker::Enqueue(RuntimeTask task) {
  std::lock_guard<std::mutex> guard(lock_);
  if (!started_ || stopping_ || task.session_id.empty() || task.request_id.empty()) return false;
  queue_.push(std::move(task));
  condition_.notify_one();
  return true;
}

void NativeRuntimeWorker::Cancel(const std::string& session_id, const std::string& request_id) {
  std::vector<RuntimeTask> cancelled;
  {
    std::lock_guard<std::mutex> guard(lock_);
    const std::string key = session_id + "\n" + request_id;
    if (key == active_key_ && active_cancelled_) active_cancelled_->store(true, std::memory_order_relaxed);
    std::queue<RuntimeTask> retained;
    while (!queue_.empty()) {
      RuntimeTask task = std::move(queue_.front());
      queue_.pop();
      if (task.session_id == session_id && task.request_id == request_id) {
        cancelled.push_back(std::move(task));
      } else {
        retained.push(std::move(task));
      }
    }
    queue_ = std::move(retained);
  }
  // Emit outside the worker mutex. The daemon callback may synchronously
  // inspect task state and therefore must never run while this lock is held.
  for (const auto& task : cancelled) {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "cancelled", "", "", ""});
  }
}

void NativeRuntimeWorker::Stop() {
  {
    std::lock_guard<std::mutex> guard(lock_);
    if (!started_) return;
    stopping_ = true;
    if (active_cancelled_) active_cancelled_->store(true, std::memory_order_relaxed);
    condition_.notify_all();
  }
  if (thread_.joinable()) thread_.join();
  std::lock_guard<std::mutex> guard(lock_);
  started_ = false;
  active_cancelled_.reset();
  active_key_.clear();
  while (!queue_.empty()) queue_.pop();
}

void NativeRuntimeWorker::Loop() {
  for (;;) {
    RuntimeTask task;
    std::shared_ptr<std::atomic<bool>> cancelled = std::make_shared<std::atomic<bool>>(false);
    {
      std::unique_lock<std::mutex> guard(lock_);
      condition_.wait(guard, [&] { return stopping_ || !queue_.empty(); });
      if (stopping_) return;
      task = std::move(queue_.front());
      queue_.pop();
      active_cancelled_ = cancelled;
      active_key_ = task.session_id + "\n" + task.request_id;
    }
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "started", "", "", ""});
    Run(std::move(task), cancelled);
    {
      std::lock_guard<std::mutex> guard(lock_);
      active_cancelled_.reset();
      active_key_.clear();
    }
  }
}

void NativeRuntimeWorker::Run(RuntimeTask task,
                              const std::shared_ptr<std::atomic<bool>>& cancelled) {
  RuntimeSecrets secrets;
  std::string secret_error;
  if (!SecretStore::Load(&secrets, &secret_error)) {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "failed", "",
                      "secret_unavailable", "Runtime secret could not be read"});
    return;
  }
  if (secrets.minimax_api_key.empty()) {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "failed", "",
                      "secret_missing", "MiniMax API key is not configured"});
    return;
  }
  const std::string prompt = PromptText(task.content_json);
  if (prompt.empty()) {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "failed", "",
                      "invalid_prompt", "Input did not contain text content"});
    return;
  }
  std::ostringstream body;
  body << "{\"model\":" << JsonEscape(
      MetadataString(task.metadata_json, "model").empty()
          ? secrets.minimax_model : MetadataString(task.metadata_json, "model"))
       << ",\"max_tokens\":1024,\"messages\":[{\"role\":\"user\",\"content\":"
       << JsonEscape(prompt) << "}]}";
  const HttpResponse response = http_.PostJson(
      secrets.minimax_base_url,
      {{"x-api-key", secrets.minimax_api_key}, {"anthropic-version", "2023-06-01"}},
      body.str(), secrets.minimax_timeout_ms, cancelled.get());
  if (cancelled->load(std::memory_order_relaxed) || response.error == "cancelled") {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "cancelled", "", "", ""});
    return;
  }
  if (response.status < 200 || response.status >= 300 || response.body.empty()) {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "failed", "",
                      ErrorCodeForHttp(response), "MiniMax request failed (" + response.error + ")"});
    return;
  }
  const std::string answer = FindStringValues(response.body, "text", false);
  if (answer.empty()) {
    Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "failed", "",
                      "runtime_invalid_response", "MiniMax response did not contain text"});
    return;
  }
  Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "output", answer, "", ""});
  Emit(RuntimeEvent{task.session_id, task.task_id, task.request_id, "completed", "", "", ""});
}

void NativeRuntimeWorker::Emit(RuntimeEvent event) {
  if (callback_) callback_(event);
}

}  // namespace agentos
