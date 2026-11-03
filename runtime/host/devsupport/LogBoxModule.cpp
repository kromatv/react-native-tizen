#include "DevSupport.h"

#include "modules/PlatformModuleRegistry.h"

#include <FBReactNativeSpec/FBReactNativeSpecJSI.h>

namespace rntizen {

namespace {

using facebook::jsi::Runtime;

/// `LogBox`: JavaScript asks for its inspector to be shown or hidden, and the
/// host runs or stops the `LogBox` surface over the app's, as Android's
/// LogBoxModule does in a dialog.
class LogBoxModule final : public facebook::react::NativeLogBoxCxxSpec<LogBoxModule> {
 public:
  LogBoxModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker, const ModuleContext &)
      : NativeLogBoxCxxSpec(std::move(jsInvoker)) {}

  void show(Runtime &) {
    DevSupport::post([](DevSupport &devSupport) { devSupport.setLogBoxShown(true); });
  }

  void hide(Runtime &) {
    DevSupport::post([](DevSupport &devSupport) { devSupport.setLogBoxShown(false); });
  }
};

} // namespace

RN_TIZEN_PLATFORM_MODULE("LogBox", LogBoxModule);

} // namespace rntizen
