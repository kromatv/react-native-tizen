#include "PerfMonitor.h"

#include <doctest/doctest.h>

#include <Ecore.h>

namespace rntizen {

TEST_CASE("PerfMonitor without a control link stays idle") {
  ecore_init();

  {
    const PerfMonitor monitor({.evas = nullptr, .controlLink = nullptr, .jsThread = nullptr, .runtimeExecutor = {}});

    CHECK_NOTHROW(ecore_main_loop_iterate());
  }

  ecore_shutdown();
}

} // namespace rntizen
