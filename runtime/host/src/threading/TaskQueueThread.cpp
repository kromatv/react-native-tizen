#include "TaskQueueThread.h"

#include "../logging/Log.h"

#include <folly/ScopeGuard.h>
#include <pthread.h>

#include <algorithm>
#include <exception>
#include <future>
#include <memory>

namespace rntizen {

namespace {

std::int64_t nowNanos() {
  return std::chrono::steady_clock::now().time_since_epoch().count();
}

} // namespace

TaskQueueThread::TaskQueueThread(std::string name) : name_(std::move(name)), thread_([this] { run(); }) {}

TaskQueueThread::~TaskQueueThread() {
  quitSynchronous();
}

bool TaskQueueThread::enqueue(std::function<void()> &&task) {
  {
    std::lock_guard lock(mutex_);
    if (quitting_) return false;
    tasks_.push_back(std::move(task));
  }
  wake_.notify_one();
  return true;
}

void TaskQueueThread::runOnQueue(std::function<void()> &&task) {
  enqueue(std::move(task));
}

void TaskQueueThread::runOnQueueSync(std::function<void()> &&task) {
  if (isOnQueue()) {
    task();
    return;
  }
  auto packaged = std::make_shared<std::packaged_task<void()>>(std::move(task));
  auto finished = packaged->get_future();
  if (!enqueue([packaged = std::move(packaged)] { (*packaged)(); })) return;
  try {
    finished.get();
  } catch (const std::future_error &error) {
    if (error.code() != std::future_errc::broken_promise) throw;
  }
}

bool TaskQueueThread::runWhileParked(const std::function<void()> &work) {
  auto parked = std::make_shared<std::promise<void>>();
  auto isParked = parked->get_future();
  std::promise<void> released;
  auto park = [parked = std::move(parked), release = released.get_future().share()] {
    parked->set_value();
    release.wait();
  };
  if (!enqueue(std::move(park))) return false;
  try {
    isParked.get();
  } catch (const std::future_error &) {
    return false;
  }
  const auto release = folly::makeGuard([&released] { released.set_value(); });
  work();
  return true;
}

void TaskQueueThread::quitSynchronous() {
  {
    std::lock_guard lock(mutex_);
    if (quitting_) return;
    quitting_ = true;
  }
  wake_.notify_all();
  if (thread_.joinable() && !isOnQueue()) thread_.join();
}

bool TaskQueueThread::isOnQueue() const {
  return std::this_thread::get_id() == thread_.get_id();
}

void TaskQueueThread::setMeasured(bool measured) {
  measured_.store(measured, std::memory_order_relaxed);
}

std::chrono::nanoseconds TaskQueueThread::busyTime() const {
  const auto runningSince = runningSinceNanos_.load(std::memory_order_relaxed);
  auto busy = busyNanos_.load(std::memory_order_relaxed);
  if (runningSince != 0) busy += std::max<std::int64_t>(0, nowNanos() - runningSince);
  return std::chrono::nanoseconds(busy);
}

void TaskQueueThread::run() {
  pthread_setname_np(pthread_self(), name_.substr(0, 15).c_str());
  std::unique_lock lock(mutex_);
  while (true) {
    wake_.wait(lock, [this] { return quitting_ || !tasks_.empty(); });
    if (quitting_) break;
    auto task = std::move(tasks_.front());
    tasks_.pop_front();
    lock.unlock();
    const bool measured = measured_.load(std::memory_order_relaxed);
    const auto started = measured ? nowNanos() : 0;
    if (measured) runningSinceNanos_.store(started, std::memory_order_relaxed);
    try {
      task();
    } catch (...) {
      logUncaughtException(name_);
    }
    if (measured) {
      runningSinceNanos_.store(0, std::memory_order_relaxed);
      busyNanos_.fetch_add(nowNanos() - started, std::memory_order_relaxed);
    }
    lock.lock();
  }
  auto dropped = std::move(tasks_);
  lock.unlock();
}

} // namespace rntizen
