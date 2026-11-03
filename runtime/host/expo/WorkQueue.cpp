#include "WorkQueue.h"

#include "logging/Log.h"

#include <folly/Indestructible.h>

#include <condition_variable>
#include <deque>
#include <mutex>
#include <optional>
#include <stop_token>
#include <string>
#include <thread>
#include <vector>

namespace rntizen::expo {

namespace {

constexpr int kThreadCount = 3;

void runLogged(const std::function<void()> &task) {
  try {
    task();
  } catch (const std::exception &error) {
    log(LogLevel::Error, std::string("An Expo background task failed: ") + error.what());
  }
}

class WorkQueue final {
 public:
  WorkQueue() {
    workers_.reserve(kThreadCount);
    for (int index = 0; index < kThreadCount; ++index) {
      workers_.emplace_back([this](const std::stop_token &stop) { run(stop); });
    }
  }

  void push(std::function<void()> task) {
    {
      std::lock_guard lock(mutex_);
      tasks_.push_back(std::move(task));
    }
    wake_.notify_one();
  }

 private:
  void run(const std::stop_token &stop) {
    while (!stop.stop_requested()) {
      if (auto task = next(stop); task.has_value()) runLogged(*task);
    }
  }

  std::optional<std::function<void()>> next(const std::stop_token &stop) {
    std::unique_lock lock(mutex_);
    if (!wake_.wait(lock, stop, [this] { return !tasks_.empty(); })) return std::nullopt;
    auto task = std::move(tasks_.front());
    tasks_.pop_front();
    return task;
  }

  std::mutex mutex_;
  std::condition_variable_any wake_;
  std::deque<std::function<void()>> tasks_;
  std::vector<std::jthread> workers_;
};

} // namespace

void runInBackground(std::function<void()> task) {
  static folly::Indestructible<WorkQueue> queue;
  queue->push(std::move(task));
}

} // namespace rntizen::expo
