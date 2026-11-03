#include "FontInstances.h"

#include <doctest/doctest.h>

#include <filesystem>

namespace rntizen {

namespace fs = std::filesystem;

TEST_CASE("writeWeightInstances writes nothing for a missing font or a font without a weight axis") {
  const auto directory = fs::temp_directory_path() / "rn-tizen-font-instances-test";
  const fs::path staticFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

  CHECK(writeWeightInstances("/nonexistent/Font.ttf", directory).empty());
  if (fs::exists(staticFont)) CHECK(writeWeightInstances(staticFont, directory).empty());
}

} // namespace rntizen
