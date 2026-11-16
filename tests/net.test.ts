import { describe, expect, test } from "bun:test";
import { parseKeys } from "../src/net/KeyParser";
import { TelnetParser } from "../src/net/TelnetParser";

describe("TelnetParser", () => {
  test("passes plain data through untouched", () => {
    const result = new TelnetParser().feed(new TextEncoder().encode("wasd"));
    expect(new TextDecoder().decode(result.data)).toBe("wasd");
    expect(result.replies).toBeNull();
  });

  test("reads the NAWS window size, even when split across packets", () => {
    const parser = new TelnetParser();
    parser.feed(Uint8Array.from([255, 250, 31, 0]));
    const result = parser.feed(Uint8Array.from([120, 0, 40, 255, 240, 119]));
    expect(result.size).toEqual({ cols: 120, rows: 40 });
    expect([...result.data]).toEqual([119]);
  });

  test("refuses unsupported options", () => {
    const result = new TelnetParser().feed(Uint8Array.from([255, 253, 24]));
    expect([...result.replies!]).toEqual([255, 252, 24]);
  });

  test("unescapes a doubled IAC", () => {
    expect([...new TelnetParser().feed(Uint8Array.from([65, 255, 255, 66])).data]).toEqual([65, 255, 66]);
  });

  test("flags Interrupt Process", () => {
    expect(new TelnetParser().feed(Uint8Array.from([255, 244])).interrupt).toBe(true);
  });
});

describe("parseKeys", () => {
  test("recognises arrows, enter, tab and characters", () => {
    expect(parseKeys("\x1b[Aa\r\n\tя\x7f")).toEqual([
      { type: "up" },
      { type: "char", ch: "a" },
      { type: "enter" },
      { type: "tab" },
      { type: "char", ch: "я" },
      { type: "backspace" },
    ]);
  });

  test("skips unknown escape sequences", () => {
    expect(parseKeys("\x1b[15~x")).toEqual([{ type: "char", ch: "x" }]);
  });

  test("treats a lone ESC as the escape key", () => {
    expect(parseKeys("\x1b")).toEqual([{ type: "esc" }]);
  });
});
