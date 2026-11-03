#include "HostConfig.h"

#include <doctest/doctest.h>

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>

namespace rntizen {

namespace {

class ConfigDir final {
 public:
  explicit ConfigDir(const std::string &json) {
    std::string pattern = (std::filesystem::temp_directory_path() / "rn-tizen-config-XXXXXX").string();
    path_ = ::mkdtemp(pattern.data());
    std::ofstream(std::filesystem::path(path_) / "react-native-tizen.json") << json;
  }

  ~ConfigDir() {
    std::filesystem::remove_all(path_);
  }

  ConfigDir(const ConfigDir &) = delete;
  ConfigDir &operator=(const ConfigDir &) = delete;

  const std::string &path() const {
    return path_;
  }

 private:
  std::string path_;
};

} // namespace

TEST_CASE("A bundle from a dev server needs no bundle file") {
  const ConfigDir dir(R"({"appKey":"main","bundleUrl":"http://192.168.1.20:8081/index.bundle","development":true})");

  const auto config = loadHostConfig(dir.path());

  CHECK(config.bundleUrl == "http://192.168.1.20:8081/index.bundle");
  CHECK(config.bundleFile.empty());
  CHECK(config.development);
}

TEST_CASE("A packaged bundle needs its file") {
  const ConfigDir packaged(R"({"appKey":"main","bundleFile":"index.tizen.hbc"})");
  const ConfigDir missing(R"({"appKey":"main"})");

  CHECK(loadHostConfig(packaged.path()).bundleFile == "index.tizen.hbc");
  CHECK_FALSE(loadHostConfig(packaged.path()).bundleUrl.has_value());
  CHECK_THROWS_AS(loadHostConfig(missing.path()), std::runtime_error);
}

TEST_CASE("A bundle URL beside a bundle file keeps both") {
  const ConfigDir dir(R"({"appKey":"main","bundleFile":"index.tizen.hbc","bundleUrl":"http://h:8081/index.bundle"})");

  const auto config = loadHostConfig(dir.path());

  CHECK(config.bundleFile == "index.tizen.hbc");
  CHECK(config.bundleUrl.has_value());
}

} // namespace rntizen
