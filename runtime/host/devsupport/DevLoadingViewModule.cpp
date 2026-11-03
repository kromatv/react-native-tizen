#include "DevSupport.h"

#include "modules/PlatformModuleRegistry.h"

#include <FBReactNativeSpec/FBReactNativeSpecJSI.h>

#include <cstdint>
#include <optional>

namespace rntizen {

namespace {

using facebook::jsi::Runtime;

std::optional<std::uint32_t> argbColor(std::optional<double> color) {
  if (!color.has_value()) return std::nullopt;
  return static_cast<std::uint32_t>(static_cast<std::int64_t>(*color));
}

/// `DevLoadingView`: the "Refreshing..." banner Fast Refresh shows while it
/// applies an edit. The banner has no dismiss button: a remote cannot press it.
class DevLoadingViewModule final : public facebook::react::NativeDevLoadingViewCxxSpec<DevLoadingViewModule> {
 public:
  DevLoadingViewModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker, const ModuleContext &)
      : NativeDevLoadingViewCxxSpec(std::move(jsInvoker)) {}

  void showMessage(
      Runtime &,
      std::string message,
      std::optional<double> textColor,
      std::optional<double> backgroundColor,
      std::optional<bool>) {
    DevSupport::post([message = std::move(message),
                      text = argbColor(textColor),
                      background = argbColor(backgroundColor)](DevSupport &devSupport) {
      devSupport.showMessage(message, text, background);
    });
  }

  void hide(Runtime &) {
    DevSupport::post([](DevSupport &devSupport) { devSupport.hideMessage(); });
  }
};

} // namespace

RN_TIZEN_PLATFORM_MODULE("DevLoadingView", DevLoadingViewModule);

} // namespace rntizen
