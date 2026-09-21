#include <android/binder_manager.h>
#include <android/binder_process.h>
#include <android-base/logging.h>

#include <chrono>
#include <memory>

#include "aidl/com/example/agentos/BnSideagentd.h"

using aidl::com::example::agentos::AgentHealth;
using aidl::com::example::agentos::BnSideagentd;
using ndk::ScopedAStatus;

namespace {

class Sideagentd final : public BnSideagentd {
 public:
  Sideagentd() : started_at_ms_(NowMs()) {}

  ScopedAStatus getHealth(AgentHealth* out) override {
    if (out == nullptr) return ScopedAStatus::fromExceptionCode(EX_NULL_POINTER);
    out->protocolVersion = 1;
    out->state = "ready";
    out->startedAtMs = started_at_ms_;
    out->activeSessions = 0;
    out->queuedTasks = 0;
    return ScopedAStatus::ok();
  }

 private:
  static int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
  }

  const int64_t started_at_ms_;
};

}  // namespace

int main() {
  android::base::InitLogging(nullptr);
  ABinderProcess_setThreadPoolMaxThreadCount(4);

  auto service = ndk::SharedRefBase::make<Sideagentd>();
  const binder_status_t status =
      AServiceManager_addService(service->asBinder().get(), "agentos.sideagentd");
  if (status != STATUS_OK) {
    LOG(ERROR) << "Unable to publish agentos.sideagentd: " << status;
    return 1;
  }

  LOG(INFO) << "sideagentd health service ready";
  ABinderProcess_startThreadPool();
  ABinderProcess_joinThreadPool();
  return 0;
}
