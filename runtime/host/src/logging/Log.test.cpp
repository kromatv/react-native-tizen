#include "Log.h"

#include <doctest/doctest.h>

#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace rntizen {

namespace {

class RecordingSink final : public LogSink {
 public:
  void write(LogLevel level, std::string_view message) override { lines.emplace_back(level, std::string(message)); }

  std::vector<std::pair<LogLevel, std::string>> lines;
};

std::shared_ptr<RecordingSink> installRecordingSink() {
  auto sink = std::make_shared<RecordingSink>();
  setLogSink(sink);
  return sink;
}

} // namespace

TEST_CASE("log writes to the installed sink until it is removed") {
  auto sink = installRecordingSink();

  log(LogLevel::Warning, "first");
  setLogSink(nullptr);
  log(LogLevel::Warning, "second");

  REQUIRE(sink->lines.size() == 1);
  CHECK(sink->lines[0].first == LogLevel::Warning);
  CHECK(sink->lines[0].second == "first");
}

TEST_CASE("logUncaughtException names the boundary and what the exception says") {
  auto sink = installRecordingSink();

  try {
    throw std::runtime_error("boom");
  } catch (...) {
    logUncaughtException("the main loop");
  }
  try {
    throw 42;
  } catch (...) {
    logUncaughtException("rn-js");
  }
  setLogSink(nullptr);

  REQUIRE(sink->lines.size() == 2);
  CHECK(sink->lines[0].first == LogLevel::Error);
  CHECK(sink->lines[0].second == "Uncaught exception on the main loop: boom");
  CHECK(sink->lines[1].second == "Uncaught exception on rn-js, not a std::exception");
}

TEST_CASE("logLevelName names every level") {
  CHECK(logLevelName(LogLevel::Debug) == "debug");
  CHECK(logLevelName(LogLevel::Info) == "info");
  CHECK(logLevelName(LogLevel::Warning) == "warn");
  CHECK(logLevelName(LogLevel::Error) == "error");
}

} // namespace rntizen
