#include "DevSupport.h"

#include "logging/Log.h"
#include "threading/MainThread.h"

#include <mutex>

namespace rntizen {

namespace {

constexpr const char *kPlatform = "tizen";
constexpr const char *kClientId = "DevSupport";
constexpr std::uint32_t kLoadTextColor = 0xffffffff;
constexpr std::uint32_t kLoadBackgroundColor = 0xff404040;

struct Current {
  std::mutex mutex;
  std::weak_ptr<DevSupport> devSupport;
};

Current &current() {
  static Current shared;
  return shared;
}

std::string deviceName(const DeviceProfile &device) {
  return device.modelName + " - Tizen " + device.platformVersion;
}

} // namespace

std::shared_ptr<DevSupport> DevSupport::start(const std::string &bundleUrl, const DeviceProfile &device, Host host) {
  auto server = devServerOf(bundleUrl);
  if (!server) {
    log(LogLevel::Warning, bundleUrl + " is not on a dev server: no Fast Refresh, reload or LogBox");
    return nullptr;
  }
  auto devSupport = std::make_shared<DevSupport>(std::move(*server), device, std::move(host));
  auto &shared = current();
  std::lock_guard lock(shared.mutex);
  shared.devSupport = devSupport;
  return devSupport;
}

void DevSupport::post(std::function<void(DevSupport &)> task) {
  std::weak_ptr<DevSupport> weak;
  {
    auto &shared = current();
    std::lock_guard lock(shared.mutex);
    weak = shared.devSupport;
  }
  runOnMainThread([weak = std::move(weak), task = std::move(task)] {
    if (auto devSupport = weak.lock()) task(*devSupport);
  });
}

DevSupport::DevSupport(DevServer server, const DeviceProfile &device, Host host)
    : server_(std::move(server)),
      host_(std::move(host)),
      banner_(host_.evas, host_.screenWidth, host_.screenHeight) {
  const auto query = "?device=" + encodeQueryValue(deviceName(device)) + "&app=" + encodeQueryValue(server_.app) +
      "&clientid=" + kClientId;
  packager_ = std::make_unique<PackagerConnection>(
      server_.socketUrl("/message" + query),
      PackagerConnection::Handlers{
          .reload = [this] { reload("Reload from the dev server"); },
          .devMenu =
              [] {
                log(LogLevel::Info,
                    "Tizen has no developer menu yet: press r to reload and j to open the debugger in the dev "
                    "server's terminal");
              },
      });
}

void DevSupport::instanceStarted(
    std::shared_ptr<InstanceGate> gate,
    const facebook::react::RuntimeExecutor &afterBundle) {
  gate_ = std::move(gate);
  logBoxShown_ = false;
  showMessage("Loading from " + server_.authority() + "…", std::nullopt, std::nullopt);
  auto setup = folly::dynamic::array(
      kPlatform, server_.bundlePath, server_.host, server_.port, hotLoadingEnabled_, server_.scheme);
  gate_->callFunctionOnModule("HMRClient", "setup", std::move(setup));
  afterBundle([](facebook::jsi::Runtime &) {
    post([](DevSupport &devSupport) { devSupport.hideMessage(); });
  });
}

void DevSupport::reload(const std::string &reason) {
  log(LogLevel::Info, "Reloading: " + reason);
  host_.reload();
}

void DevSupport::setHotLoadingEnabled(bool enabled) {
  if (hotLoadingEnabled_ == enabled) return;
  hotLoadingEnabled_ = enabled;
  reload(enabled ? "Fast Refresh turned on" : "Fast Refresh turned off");
}

void DevSupport::toggleElementInspector() {
  emitDeviceEvent("toggleElementInspector", nullptr);
}

void DevSupport::showMessage(
    const std::string &message,
    std::optional<std::uint32_t> textColor,
    std::optional<std::uint32_t> backgroundColor) {
  banner_.show(message, textColor.value_or(kLoadTextColor), backgroundColor.value_or(kLoadBackgroundColor));
}

void DevSupport::hideMessage() {
  banner_.hide();
}

void DevSupport::setLogBoxShown(bool shown) {
  if (logBoxShown_ == shown) return;
  logBoxShown_ = shown;
  host_.showLogBox(shown);
}

void DevSupport::emitDeviceEvent(const std::string &name, folly::dynamic payload) {
  if (gate_ == nullptr) return;
  gate_->callFunctionOnModule("RCTDeviceEventEmitter", "emit", folly::dynamic::array(name, std::move(payload)));
}

} // namespace rntizen
