#pragma once

#include <memory>
#include <string_view>

namespace rntizen {

enum class LogLevel { Debug, Info, Warning, Error };

/// Somewhere log lines go besides the TV's own dlog, which retail sets do not
/// let a developer read.
class LogSink {
 public:
  virtual ~LogSink() = default;
  virtual void write(LogLevel level, std::string_view message) = 0;
};

/// Logs to dlog under the `ReactNative` tag and to the installed sink, if any.
/// Safe from any thread.
void log(LogLevel level, std::string_view message);

/// Logs the exception being handled as an error that reached `boundary`, such
/// as "the main loop". Call it from a catch block.
void logUncaughtException(std::string_view boundary) noexcept;

/// Replaces the extra sink; `nullptr` removes it.
void setLogSink(std::shared_ptr<LogSink> sink);

std::string_view logLevelName(LogLevel level);

} // namespace rntizen
