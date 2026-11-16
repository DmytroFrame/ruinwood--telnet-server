export type SpecialKey = "up" | "down" | "left" | "right" | "enter" | "backspace" | "tab" | "esc" | "quit";

export type Key = { readonly type: "char"; readonly ch: string } | { readonly type: SpecialKey };

const ARROWS: Readonly<Record<string, SpecialKey>> = { A: "up", B: "down", C: "right", D: "left" };
const SEQUENCE_END = /[A-Za-z~]/;

/** Splits decoded terminal input into key presses (arrows arrive as `ESC [ A`..`D`). */
export function parseKeys(text: string): Key[] {
  const keys: Key[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    switch (c) {
      case "\x1b": {
        const next = chars[i + 1];
        const arrow = next === "[" || next === "O" ? ARROWS[chars[i + 2] ?? ""] : undefined;
        if (arrow) {
          keys.push({ type: arrow });
          i += 2;
        } else if (next === "[") {
          // Unknown sequence (F-keys etc.): skip up to its final letter.
          i += 2;
          while (i < chars.length && !SEQUENCE_END.test(chars[i]!)) i++;
        } else {
          keys.push({ type: "esc" });
        }
        break;
      }
      case "\r":
        keys.push({ type: "enter" });
        if (chars[i + 1] === "\n" || chars[i + 1] === "\0") i++;
        break;
      case "\n":
        keys.push({ type: "enter" });
        break;
      case "\t":
        keys.push({ type: "tab" });
        break;
      case "\x7f":
      case "\b":
        keys.push({ type: "backspace" });
        break;
      case "\x03":
      case "\x04":
        keys.push({ type: "quit" });
        break;
      default:
        if (c >= " ") keys.push({ type: "char", ch: c });
    }
  }
  return keys;
}
