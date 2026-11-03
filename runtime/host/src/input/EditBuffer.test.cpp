#include "EditBuffer.h"

#include <doctest/doctest.h>

#include <string>

namespace rntizen {

TEST_CASE("decodeUtf8 decodes every sequence length") {
  CHECK(decodeUtf8("a\xC3\xA9\xE2\x82\xAC\xF0\x9F\x98\x80") == U"aé€\U0001F600");
  CHECK(decodeUtf8("\xF4\x8F\xBF\xBF") == U"\U0010FFFF");
}

TEST_CASE("decodeUtf8 never swallows the character after a truncated sequence") {
  CHECK(decodeUtf8("\xE2\x82" "a") == U"�a");
  CHECK(decodeUtf8("\xC3" "b") == U"�b");
  CHECK(decodeUtf8("\xF0\x9F\x98") == U"�");
}

TEST_CASE("decodeUtf8 replaces each maximal invalid subpart, as Unicode's example does") {
  const std::string bytes = "\x61\xF1\x80\x80\xE1\x80\xC2\x62\x80\x63\x80\xBF\x64";

  CHECK(decodeUtf8(bytes) == U"a���b�c��d");
}

TEST_CASE("decodeUtf8 rejects overlong forms, surrogates and code points past U+10FFFF") {
  CHECK(decodeUtf8("\xC0\xAF") == U"��");
  CHECK(decodeUtf8("\xE0\x80\xAF") == U"���");
  CHECK(decodeUtf8("\xED\xA0\x80") == U"���");
  CHECK(decodeUtf8("\xF0\x80\x80\x80") == U"����");
  CHECK(decodeUtf8("\xF4\x90\x80\x80") == U"����");
  CHECK(decodeUtf8("\xF5\xFF") == U"��");
}

TEST_CASE("encodeUtf8 reverses decodeUtf8") {
  const std::string text = "a\xC3\xA9\xE2\x82\xAC\xF0\x9F\x98\x80";

  CHECK(encodeUtf8(decodeUtf8(text)) == text);
}

TEST_CASE("setText puts the caret after the last code point") {
  EditBuffer buffer;

  buffer.setText("h\xC3\xA9\xF0\x9F\x98\x80");

  CHECK(buffer.size() == 3);
  CHECK(buffer.utf16Size() == 4);
  CHECK(buffer.caret() == 3);
  CHECK_FALSE(buffer.hasSelection());
  CHECK(buffer.selectionUtf16() == EditBuffer::Range{.start = 4, .end = 4});
}

TEST_CASE("insert keeps what maxLength leaves room for and never splits a surrogate pair") {
  EditBuffer buffer;
  buffer.setText("ab");

  const bool changed = buffer.insert(U"c\U0001F600d", 4);

  CHECK(changed);
  CHECK(buffer.utf8() == "abc");
  CHECK(buffer.caret() == 3);
}

TEST_CASE("insert replaces the selection") {
  EditBuffer buffer;
  buffer.setText("hello");
  buffer.selectUtf16(1, 4);

  buffer.insert(U"EY", 100);

  CHECK(buffer.utf8() == "hEYo");
  CHECK(buffer.caret() == 3);
}

TEST_CASE("compose keeps the composition and puts the caret inside it") {
  EditBuffer buffer;
  buffer.setText("ab");
  buffer.moveTo(1, false);

  buffer.compose(U"xyz", 1, 100);

  CHECK(buffer.utf8() == "axyzb");
  CHECK(buffer.composing() == EditBuffer::Range{.start = 1, .end = 4});
  CHECK(buffer.caret() == 2);
}

TEST_CASE("commit replaces the composition and ends it") {
  EditBuffer buffer;
  buffer.compose(U"ka", 2, 100);

  buffer.commit(U"か", 100);

  CHECK(buffer.utf8() == "\xE3\x81\x8B");
  CHECK_FALSE(buffer.composing().has_value());
  CHECK(buffer.caret() == 1);
}

TEST_CASE("deleteBackward and deleteForward delete around the caret") {
  EditBuffer buffer;
  buffer.setText("abc");
  buffer.moveTo(1, false);

  CHECK(buffer.deleteBackward());
  CHECK_FALSE(buffer.deleteBackward());
  CHECK(buffer.deleteForward());

  CHECK(buffer.utf8() == "c");
  CHECK(buffer.caret() == 0);
}

TEST_CASE("deleteAround deletes from an offset after the caret, clamped to the text") {
  EditBuffer buffer;
  buffer.setText("abcdef");
  buffer.moveTo(3, false);

  CHECK(buffer.deleteAround(-2, 2));
  CHECK_FALSE(buffer.deleteAround(10, 1));

  CHECK(buffer.utf8() == "adef");
  CHECK(buffer.caret() == 1);
}

} // namespace rntizen
