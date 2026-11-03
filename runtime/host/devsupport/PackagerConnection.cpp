#include "PackagerConnection.h"

#include "logging/Log.h"
#include "threading/MainThread.h"

#include <folly/json.h>

namespace rntizen {

namespace {

constexpr int kProtocolVersion = 2;
constexpr double kRetrySeconds = 2.0;
constexpr std::size_t kMaxMessageBytes = 64 * 1024;

} // namespace

PackagerConnection::PackagerConnection(std::string url, Handlers handlers)
    : url_(std::move(url)), handlers_(std::move(handlers)), lifetime_(std::make_shared<PackagerConnection *>(this)) {
  open();
}

PackagerConnection::~PackagerConnection() {
  lifetime_.reset();
  if (retryTimer_ != nullptr) ecore_timer_del(retryTimer_);
}

void PackagerConnection::open() {
  auto onMainThread = [weak = std::weak_ptr<PackagerConnection *>(lifetime_)](
                          std::function<void(PackagerConnection &)> task) {
    runOnMainThread([weak, task = std::move(task)] {
      if (auto self = weak.lock()) task(**self);
    });
  };
  socket_ = std::make_unique<WebSocketConnection>(
      WebSocketRequest{.url = url_, .protocols = {}, .headers = {}},
      WebSocketListener{
          .onOpen =
              [onMainThread](const std::string &) {
                onMainThread([](PackagerConnection &self) {
                  self.reportedFailure_ = false;
                  log(LogLevel::Info, "Connected to the dev server at " + self.url_);
                });
              },
          .onMessage =
              [onMainThread](std::string data, bool binary) {
                if (binary) return;
                onMainThread([data = std::move(data)](PackagerConnection &self) { self.receive(data); });
              },
          .onClosed =
              [onMainThread](int, const std::string &) {
                onMainThread([](PackagerConnection &self) { self.retryLater(); });
              },
          .onFailed =
              [onMainThread](const std::string &message) {
                onMainThread([message](PackagerConnection &self) {
                  if (!self.reportedFailure_) log(LogLevel::Warning, "No dev server at " + self.url_ + ": " + message);
                  self.reportedFailure_ = true;
                  self.retryLater();
                });
              },
      });
}

void PackagerConnection::retryLater() {
  if (retryTimer_ != nullptr) return;
  retryTimer_ = ecore_timer_add(kRetrySeconds, retry, this);
}

Eina_Bool PackagerConnection::retry(void *data) {
  auto &self = *static_cast<PackagerConnection *>(data);
  self.retryTimer_ = nullptr;
  self.socket_.reset();
  self.open();
  return ECORE_CALLBACK_CANCEL;
}

void PackagerConnection::receive(std::string_view text) {
  if (text.size() > kMaxMessageBytes) return;
  folly::dynamic message;
  try {
    message = folly::parseJson(text);
  } catch (const folly::json::parse_error &) {
    log(LogLevel::Warning, "The dev server sent a message that is not JSON");
    return;
  }
  if (!message.isObject()) return;
  if (const auto *version = message.get_ptr("version");
      version == nullptr || !version->isInt() || version->getInt() != kProtocolVersion) {
    log(LogLevel::Warning, "The dev server speaks another version of the packager protocol");
    return;
  }
  const auto *method = message.get_ptr("method");
  const auto *id = message.get_ptr("id");
  const auto name = method != nullptr && method->isString() ? method->getString() : std::string();
  if (name == "reload" && handlers_.reload) {
    handlers_.reload();
  } else if (name == "devMenu" && handlers_.devMenu) {
    handlers_.devMenu();
  } else if (id != nullptr && !id->isNull()) {
    answerError(*id, name.empty() ? "No method provided" : "No request handler for method: " + name);
  }
}

void PackagerConnection::answerError(const folly::dynamic &id, const std::string &error) {
  if (socket_ == nullptr) return;
  const folly::dynamic reply = folly::dynamic::object("version", kProtocolVersion)("id", id)("error", error);
  socket_->send(WebSocketOpcode::Text, folly::toJson(reply));
}

} // namespace rntizen
