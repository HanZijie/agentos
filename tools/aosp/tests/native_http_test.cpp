// Host regression checks for malformed server responses and URL port parsing.
// Compile this translation unit with OpenSSL and -fno-exceptions, like Android.
#include <cassert>
#include "../../../platform/aosp-integration/overlay/system/agent/sideagentd/https_client.cpp"

int main() {
  agentos::Url url;
  assert(agentos::ParseUrl("https://api.example.test:8443/v1/messages", &url));
  assert(url.port == 8443 && url.host == "api.example.test");
  for (const auto& invalid : {"https://h:9999999999999999/", "https://h:123abc/",
                              "https://h:/", "https://h:65536/", "https://h:-1/"}) {
    agentos::Url bad;
    assert(!agentos::ParseUrl(invalid, &bad));
  }
  assert(agentos::DecodeChunked("a\r\n0123456789\r\n0\r\n\r\n") == "0123456789");
  assert(agentos::DecodeChunked("B;ext=yes\r\nhello world\r\n0\r\n\r\n") == "hello world");
  assert(agentos::DecodeChunked("nope\r\nbody\r\n").empty());
  assert(agentos::DecodeChunked("ffffffffffffffffffff\r\n").empty());
  assert(agentos::DecodeChunked("b\r\nshort\r\n").empty());
}
