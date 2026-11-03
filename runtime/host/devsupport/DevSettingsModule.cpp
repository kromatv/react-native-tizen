#include "DevSupport.h"

#include "modules/PlatformModuleRegistry.h"

#include <FBReactNativeSpec/FBReactNativeSpecJSI.h>

namespace rntizen {

namespace {

using facebook::jsi::Runtime;

/// `DevSettings`, which every `__DEV__` bundle requires at startup through
/// HMRClient. Reload and Fast Refresh go to the app's DevSupport; Tizen has no
/// developer menu, shake or profiler, so those calls do nothing.
class DevSettingsModule final : public facebook::react::NativeDevSettingsCxxSpec<DevSettingsModule> {
 public:
  DevSettingsModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker, const ModuleContext &)
      : NativeDevSettingsCxxSpec(std::move(jsInvoker)) {}

  void reload(Runtime &) {
    DevSupport::post([](DevSupport &devSupport) { devSupport.reload("DevSettings.reload()"); });
  }

  void reloadWithReason(Runtime &, std::string reason) {
    DevSupport::post([reason = std::move(reason)](DevSupport &devSupport) { devSupport.reload(reason); });
  }

  void onFastRefresh(Runtime &) {}

  void setHotLoadingEnabled(Runtime &, bool enabled) {
    DevSupport::post([enabled](DevSupport &devSupport) { devSupport.setHotLoadingEnabled(enabled); });
  }

  void setProfilingEnabled(Runtime &, bool) {}

  void toggleElementInspector(Runtime &) {
    DevSupport::post([](DevSupport &devSupport) { devSupport.toggleElementInspector(); });
  }

  void addMenuItem(Runtime &, std::string) {}

  void openDebugger(Runtime &) {}

  void addListener(Runtime &, std::string) {}

  void removeListeners(Runtime &, double) {}

  void setIsShakeToShowDevMenuEnabled(Runtime &, bool) {}
};

} // namespace

RN_TIZEN_PLATFORM_MODULE("DevSettings", DevSettingsModule);

} // namespace rntizen
