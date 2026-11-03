#include "KeyboardFocus.h"

#include <doctest/doctest.h>

#include <bit>
#include <cstdint>

namespace rntizen {

namespace {

Evas *fakeCanvas(std::uintptr_t address) {
  return std::bit_cast<Evas *>(address);
}

} // namespace

TEST_CASE("KeyboardFocus::of finds a canvas's keyboard focus until it is destroyed") {
  auto *canvas = fakeCanvas(0x1000);
  auto *other = fakeCanvas(0x2000);

  {
    KeyboardFocus focus(canvas);

    CHECK(KeyboardFocus::of(canvas) == &focus);
    CHECK(KeyboardFocus::of(other) == nullptr);
  }

  CHECK(KeyboardFocus::of(canvas) == nullptr);
}

TEST_CASE("KeyboardFocus leaves every key to the remote while no field has the keyboard") {
  KeyboardFocus focus(fakeCanvas(0x3000));
  Ecore_Event_Key key{};
  key.keyname = "Return";
  key.key = "Return";
  key.keycode = 36;

  CHECK_FALSE(focus.handleKey(key, true));
  CHECK_FALSE(focus.handleKey(key, false));
}

} // namespace rntizen
