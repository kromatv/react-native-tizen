#include "DevServer.h"

#include <cctype>
#include <charconv>
#include <string_view>

namespace rntizen {

namespace {

constexpr std::uint16_t kHttpPort = 80;
constexpr std::uint16_t kHttpsPort = 443;

std::optional<std::uint16_t> parsePort(std::string_view text) {
  std::uint16_t port = 0;
  const auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), port);
  if (error != std::errc() || end != text.data() + text.size() || port == 0) return std::nullopt;
  return port;
}

std::string queryValue(std::string_view query, std::string_view name) {
  while (!query.empty()) {
    const auto separator = query.find('&');
    const auto pair = query.substr(0, separator);
    const auto equals = pair.find('=');
    if (pair.substr(0, equals) == name && equals != std::string_view::npos) return std::string(pair.substr(equals + 1));
    if (separator == std::string_view::npos) break;
    query.remove_prefix(separator + 1);
  }
  return {};
}

} // namespace

std::string DevServer::authority() const {
  return (host.find(':') == std::string::npos ? host : "[" + host + "]") + ":" + std::to_string(port);
}

std::string DevServer::httpUrl(const std::string &path) const {
  return scheme + "://" + authority() + path;
}

std::string DevServer::socketUrl(const std::string &path) const {
  return (scheme == "https" ? "wss://" : "ws://") + authority() + path;
}

std::optional<DevServer> devServerOf(const std::string &bundleUrl) {
  const std::string_view url(bundleUrl);
  const auto schemeEnd = url.find("://");
  if (schemeEnd == std::string_view::npos) return std::nullopt;
  const auto scheme = url.substr(0, schemeEnd);
  if (scheme != "http" && scheme != "https") return std::nullopt;
  const auto rest = url.substr(schemeEnd + 3);
  const auto authorityEnd = rest.find_first_of("/?#");
  const auto authority = rest.substr(0, authorityEnd);
  const auto location = authorityEnd == std::string_view::npos ? std::string_view() : rest.substr(authorityEnd);

  std::string_view host = authority;
  std::optional<std::uint16_t> port = scheme == "https" ? kHttpsPort : kHttpPort;
  const auto bracket = authority.find(']');
  const auto colon = authority.rfind(':');
  if (colon != std::string_view::npos && (bracket == std::string_view::npos || colon > bracket)) {
    host = authority.substr(0, colon);
    port = parsePort(authority.substr(colon + 1));
  }
  if (host.size() >= 2 && host.front() == '[' && host.back() == ']') host = host.substr(1, host.size() - 2);
  if (host.empty() || !port) return std::nullopt;

  const auto queryStart = location.find('?');
  const auto fragmentStart = location.find('#');
  auto path = location.substr(0, std::min(queryStart, fragmentStart));
  if (!path.empty() && path.front() == '/') path.remove_prefix(1);
  const auto query = queryStart == std::string_view::npos
      ? std::string_view()
      : location.substr(queryStart + 1, fragmentStart == std::string_view::npos ? std::string_view::npos
                                                                                : fragmentStart - queryStart - 1);
  return DevServer{
      .scheme = std::string(scheme),
      .host = std::string(host),
      .port = *port,
      .bundlePath = std::string(path),
      .app = queryValue(query, "app"),
  };
}

std::string encodeQueryValue(const std::string &value) {
  static constexpr char kHex[] = "0123456789ABCDEF";
  std::string encoded;
  for (const unsigned char character : value) {
    if (std::isalnum(character) != 0 || character == '-' || character == '_' || character == '.' || character == '~') {
      encoded += static_cast<char>(character);
    } else {
      encoded += '%';
      encoded += kHex[character >> 4];
      encoded += kHex[character & 0xf];
    }
  }
  return encoded;
}

} // namespace rntizen
