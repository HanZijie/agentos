#include "https_client.h"

#include <openssl/err.h>
#include <openssl/ssl.h>

#include <arpa/inet.h>
#include <fcntl.h>
#include <netdb.h>
#include <poll.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

#include <algorithm>
#include <cctype>
#include <cerrno>
#include <cstring>
#include <memory>
#include <mutex>
#include <sstream>

namespace agentos {
namespace {

constexpr size_t kMaxResponseBytes = 8 * 1024 * 1024;

struct Url {
  std::string host;
  std::string path;
  int port = 443;
};

bool ParseUrl(const std::string& input, Url* out) {
  constexpr char kScheme[] = "https://";
  if (input.compare(0, sizeof(kScheme) - 1, kScheme) != 0) return false;
  const size_t authority_start = sizeof(kScheme) - 1;
  const size_t path_start = input.find('/', authority_start);
  const std::string authority = input.substr(
      authority_start, path_start == std::string::npos ? std::string::npos : path_start - authority_start);
  if (authority.empty() || authority.find('@') != std::string::npos) return false;
  if (path_start == std::string::npos) out->path = "/";
  else out->path = input.substr(path_start);
  if (out->path.find('#') != std::string::npos) return false;
  if (authority.front() == '[') {
    const size_t close = authority.find(']');
    if (close == std::string::npos) return false;
    out->host = authority.substr(1, close - 1);
    if (close + 1 < authority.size()) {
      if (authority[close + 1] != ':') return false;
      const std::string port_text = authority.substr(close + 2);
      char* end = nullptr;
      const long port = std::strtol(port_text.c_str(), &end, 10);
      if (end == port_text.c_str() || *end != '\0') return false;
      out->port = static_cast<int>(port);
    }
  } else {
    const size_t colon = authority.rfind(':');
    if (colon != std::string::npos && authority.find(':') == colon) {
      out->host = authority.substr(0, colon);
      const std::string port_text = authority.substr(colon + 1);
      char* end = nullptr;
      const long port = std::strtol(port_text.c_str(), &end, 10);
      if (end == port_text.c_str() || *end != '\0') return false;
      out->port = static_cast<int>(port);
    } else {
      out->host = authority;
    }
  }
  if (out->host.empty() || out->port < 1 || out->port > 65535) return false;
  return true;
}

class Fd final {
 public:
  explicit Fd(int value = -1) : value_(value) {}
  ~Fd() { if (value_ >= 0) close(value_); }
  Fd(const Fd&) = delete;
  Fd& operator=(const Fd&) = delete;
  Fd(Fd&& other) noexcept : value_(other.value_) { other.value_ = -1; }
  Fd& operator=(Fd&& other) noexcept {
    if (this != &other) { if (value_ >= 0) close(value_); value_ = other.value_; other.value_ = -1; }
    return *this;
  }
  int get() const { return value_; }
  int release() { int value = value_; value_ = -1; return value; }
 private:
  int value_;
};

bool Cancelled(const std::atomic<bool>* cancelled) {
  return cancelled != nullptr && cancelled->load(std::memory_order_relaxed);
}

bool Wait(int fd, short events, int timeout_ms, const std::atomic<bool>* cancelled) {
  const int slice = 100;
  int remaining = std::max(1, timeout_ms);
  while (remaining > 0) {
    if (Cancelled(cancelled)) return false;
    pollfd poll_fd{fd, events, 0};
    const int result = poll(&poll_fd, 1, std::min(slice, remaining));
    if (result > 0) return (poll_fd.revents & (events | POLLERR | POLLHUP)) != 0;
    if (result < 0 && errno != EINTR) return false;
    remaining -= slice;
  }
  return false;
}

bool SetNonBlocking(int fd, bool enabled) {
  const int flags = fcntl(fd, F_GETFL, 0);
  if (flags < 0) return false;
  return fcntl(fd, F_SETFL, enabled ? flags | O_NONBLOCK : flags & ~O_NONBLOCK) == 0;
}

Fd Connect(const Url& url, int timeout_ms, const std::atomic<bool>* cancelled) {
  addrinfo hints{};
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_family = AF_UNSPEC;
  addrinfo* result = nullptr;
  const std::string service = std::to_string(url.port);
  if (getaddrinfo(url.host.c_str(), service.c_str(), &hints, &result) != 0) return Fd();
  Fd socket;
  for (addrinfo* item = result; item != nullptr; item = item->ai_next) {
    if (Cancelled(cancelled)) break;
    Fd candidate(::socket(item->ai_family, item->ai_socktype, item->ai_protocol));
    if (candidate.get() < 0 || !SetNonBlocking(candidate.get(), true)) continue;
    const int connected = connect(candidate.get(), item->ai_addr, item->ai_addrlen);
    if (connected == 0 || (connected < 0 && errno == EINPROGRESS &&
                           Wait(candidate.get(), POLLOUT, timeout_ms, cancelled))) {
      int error = 0;
      socklen_t size = sizeof(error);
      if (getsockopt(candidate.get(), SOL_SOCKET, SO_ERROR, &error, &size) == 0 && error == 0) {
        socket = std::move(candidate);
        break;
      }
    }
  }
  freeaddrinfo(result);
  return socket;
}

bool WriteTls(SSL* ssl, const std::string& request, int timeout_ms,
              const std::atomic<bool>* cancelled) {
  size_t offset = 0;
  while (offset < request.size()) {
    if (Cancelled(cancelled)) return false;
    const int written = SSL_write(ssl, request.data() + offset,
                                  static_cast<int>(std::min<size_t>(request.size() - offset, 16384)));
    if (written > 0) { offset += written; continue; }
    const int error = SSL_get_error(ssl, written);
    if (error == SSL_ERROR_WANT_READ && Wait(SSL_get_fd(ssl), POLLIN, timeout_ms, cancelled)) continue;
    if (error == SSL_ERROR_WANT_WRITE && Wait(SSL_get_fd(ssl), POLLOUT, timeout_ms, cancelled)) continue;
    return false;
  }
  return true;
}

std::string ReadTls(SSL* ssl, int timeout_ms, const std::atomic<bool>* cancelled) {
  std::string response;
  char buffer[16384];
  while (response.size() < kMaxResponseBytes) {
    if (Cancelled(cancelled)) return {};
    const int read = SSL_read(ssl, buffer, sizeof(buffer));
    if (read > 0) {
      response.append(buffer, static_cast<size_t>(read));
      continue;
    }
    const int error = SSL_get_error(ssl, read);
    if (error == SSL_ERROR_ZERO_RETURN) break;
    if (error == SSL_ERROR_WANT_READ && Wait(SSL_get_fd(ssl), POLLIN, timeout_ms, cancelled)) continue;
    if (error == SSL_ERROR_WANT_WRITE && Wait(SSL_get_fd(ssl), POLLOUT, timeout_ms, cancelled)) continue;
    return {};
  }
  return response;
}

std::string DecodeChunked(const std::string& input) {
  std::string output;
  size_t offset = 0;
  while (offset < input.size()) {
    const size_t line_end = input.find("\r\n", offset);
    if (line_end == std::string::npos) return {};
    const std::string length_text = input.substr(offset, line_end - offset);
    const size_t semicolon = length_text.find(';');
    const unsigned long length = std::stoul(length_text.substr(0, semicolon));
    offset = line_end + 2;
    if (length == 0) return output;
    if (length > input.size() - offset || input.substr(offset + length, 2) != "\r\n") return {};
    output.append(input, offset, length);
    offset += length + 2;
  }
  return {};
}

}  // namespace

HttpResponse HttpsClient::PostJson(const std::string& url,
                                   const std::map<std::string, std::string>& headers,
                                   const std::string& body, int timeout_ms,
                                   const std::atomic<bool>* cancelled) const {
  HttpResponse result;
  Url parsed;
  if (!ParseUrl(url, &parsed)) { result.error = "invalid_https_url"; return result; }
  if (timeout_ms < 1) { result.error = "invalid_timeout"; return result; }
  Fd socket = Connect(parsed, timeout_ms, cancelled);
  if (socket.get() < 0) { result.error = Cancelled(cancelled) ? "cancelled" : "connect_failed"; return result; }

  static std::once_flag ssl_once;
  std::call_once(ssl_once, [] { OPENSSL_init_ssl(0, nullptr); });
  std::unique_ptr<SSL_CTX, decltype(&SSL_CTX_free)> context(SSL_CTX_new(TLS_client_method()), SSL_CTX_free);
  if (!context) { result.error = "tls_context_failed"; return result; }
  SSL_CTX_set_verify(context.get(), SSL_VERIFY_PEER, nullptr);
  if (SSL_CTX_set_default_verify_paths(context.get()) != 1) {
    result.error = "tls_trust_store_unavailable"; return result;
  }
  std::unique_ptr<SSL, decltype(&SSL_free)> ssl(SSL_new(context.get()), SSL_free);
  if (!ssl) { result.error = "tls_session_failed"; return result; }
  SSL_set_fd(ssl.get(), socket.get());
  if (SSL_set1_host(ssl.get(), parsed.host.c_str()) != 1) {
    result.error = "tls_hostname_failed"; return result;
  }
  int handshake_error = 0;
  for (;;) {
    if (Cancelled(cancelled)) { result.error = "cancelled"; return result; }
    const int connected = SSL_connect(ssl.get());
    if (connected == 1) break;
    handshake_error = SSL_get_error(ssl.get(), connected);
    if (handshake_error == SSL_ERROR_WANT_READ && Wait(socket.get(), POLLIN, timeout_ms, cancelled)) continue;
    if (handshake_error == SSL_ERROR_WANT_WRITE && Wait(socket.get(), POLLOUT, timeout_ms, cancelled)) continue;
    result.error = "tls_connect_failed"; return result;
  }

  std::ostringstream request;
  request << "POST " << parsed.path << " HTTP/1.1\r\n"
          << "Host: " << parsed.host << "\r\n"
          << "Content-Type: application/json\r\n"
          << "Content-Length: " << body.size() << "\r\n"
          << "Connection: close\r\n";
  for (const auto& [name, value] : headers) request << name << ": " << value << "\r\n";
  request << "\r\n" << body;
  if (!WriteTls(ssl.get(), request.str(), timeout_ms, cancelled)) {
    result.error = Cancelled(cancelled) ? "cancelled" : "tls_write_failed"; return result;
  }
  std::string raw = ReadTls(ssl.get(), timeout_ms, cancelled);
  if (raw.empty()) { result.error = Cancelled(cancelled) ? "cancelled" : "tls_read_failed"; return result; }
  const size_t header_end = raw.find("\r\n\r\n");
  if (header_end == std::string::npos) { result.error = "invalid_http_response"; return result; }
  const size_t first_line_end = raw.find("\r\n");
  if (first_line_end == std::string::npos) { result.error = "invalid_http_status"; return result; }
  std::istringstream status_line(raw.substr(0, first_line_end));
  std::string version;
  status_line >> version >> result.status;
  if (result.status < 100 || result.status > 599) { result.error = "invalid_http_status"; return result; }
  std::string response_headers = raw.substr(first_line_end + 2, header_end - first_line_end - 2);
  std::string response_body = raw.substr(header_end + 4);
  std::string lower_headers = response_headers;
  std::transform(lower_headers.begin(), lower_headers.end(), lower_headers.begin(),
                 [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  if (lower_headers.find("transfer-encoding: chunked") != std::string::npos) {
    response_body = DecodeChunked(response_body);
  }
  if (response_body.size() > kMaxResponseBytes) { result.error = "response_too_large"; return result; }
  result.body = std::move(response_body);
  if (result.status < 200 || result.status >= 300) result.error = "http_error";
  return result;
}

}  // namespace agentos
