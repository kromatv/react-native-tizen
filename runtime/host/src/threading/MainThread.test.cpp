#include "MainThread.h"

#include <Ecore.h>
#include <doctest/doctest.h>

#include <atomic>
#include <chrono>
#include <stdexcept>
#include <thread>
#include <vector>

namespace rntizen {

namespace {

using namespace std::chrono_literals;

class MainLoop final {
 public:
  MainLoop() { ecore_init(); }
  ~MainLoop() { ecore_shutdown(); }

  MainLoop(const MainLoop &) = delete;
  MainLoop &operator=(const MainLoop &) = delete;

  void runUntil(const std::atomic<bool> &done) const {
    const auto giveUp = std::chrono::steady_clock::now() + 5s;
    while (!done && std::chrono::steady_clock::now() < giveUp) {
      ecore_main_loop_iterate();
      std::this_thread::sleep_for(1ms);
    }
  }
};

} // namespace

TEST_CASE("runOnMainThreadSync runs a worker's task on the main loop and waits for it") {
  const MainLoop loop;
  std::atomic<bool> done{false};
  bool ranOnMain = false;
  bool ran = false;

  std::thread worker([&] {
    ran = runOnMainThreadSync([&ranOnMain] { ranOnMain = isMainThread(); });
    done = true;
  });
  loop.runUntil(done);
  worker.join();

  CHECK(ran);
  CHECK(ranOnMain);
}

TEST_CASE("runOnMainThreadSync rethrows on the worker what the task throws") {
  const MainLoop loop;
  std::atomic<bool> done{false};
  bool threw = false;

  std::thread worker([&] {
    try {
      runOnMainThreadSync([] { throw std::runtime_error("boom"); });
    } catch (const std::runtime_error &) {
      threw = true;
    }
    done = true;
  });
  loop.runUntil(done);
  worker.join();

  CHECK(threw);
}

TEST_CASE("a main-loop task that throws is logged and the loop runs the next one") {
  const MainLoop loop;
  std::atomic<bool> done{false};

  runOnMainThread([] { throw std::runtime_error("boom"); });
  runOnMainThread([] { throw 42; });
  runOnMainThread([&done] { done = true; });
  loop.runUntil(done);

  CHECK(done);
}

TEST_CASE("runOnMainThreadSync runs inline on the main thread") {
  const MainLoop loop;
  bool ran = false;

  CHECK(runOnMainThreadSync([&ran] { ran = true; }));

  CHECK(ran);
}

TEST_CASE("runOnMainThreadSync refuses work while the main loop is closing") {
  const MainLoop loop;
  closeMainThreadSync();
  bool ran = false;
  bool accepted = true;

  std::thread worker([&] { accepted = runOnMainThreadSync([&ran] { ran = true; }); });
  worker.join();
  openMainThreadSync();

  CHECK_FALSE(accepted);
  CHECK_FALSE(ran);
}

TEST_CASE("runOnMainThreadSoon tasks run at the next runPriorityTasks, in order") {
  const MainLoop loop;
  std::vector<int> order;
  std::atomic<int> finished{0};
  std::atomic<bool> done{false};

  std::thread first([&] {
    runOnMainThreadSoon([&order] { order.push_back(1); });
    if (++finished == 2) done = true;
  });
  std::this_thread::sleep_for(20ms);
  std::thread second([&] {
    runOnMainThreadSoon([&order] { order.push_back(2); });
    if (++finished == 2) done = true;
  });
  std::this_thread::sleep_for(20ms);
  runPriorityTasks();
  loop.runUntil(done);
  first.join();
  second.join();

  CHECK(order == std::vector<int>{1, 2});
}

TEST_CASE("mainThreadWaitTime adds up how long workers waited while measured") {
  const MainLoop loop;
  std::atomic<bool> done{false};
  setMainThreadWaitMeasured(true);
  const auto before = mainThreadWaitTime();

  std::thread worker([&] {
    runOnMainThreadSync([] { std::this_thread::sleep_for(10ms); });
    done = true;
  });
  loop.runUntil(done);
  worker.join();
  setMainThreadWaitMeasured(false);

  CHECK(mainThreadWaitTime() - before >= 10ms);
}

} // namespace rntizen
