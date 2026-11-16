import type { Key } from "../net/KeyParser";

export type Action =
  | "up"
  | "down"
  | "left"
  | "right"
  | "attack"
  | "potion"
  | "bomb"
  | "scroll"
  | "chat"
  | "help"
  | "settings"
  | "confirm"
  | "back";

/** Character bindings: Latin plus the keys in the same physical spots on the Ukrainian layout. */
const CHAR_BINDINGS: Readonly<Record<string, Action>> = {
  w: "up", ц: "up",
  s: "down", і: "down", ы: "down",
  a: "left", ф: "left",
  d: "right", в: "right",
  " ": "attack", j: "attack", о: "attack", "1": "attack",
  e: "potion", у: "potion", "2": "potion",
  "3": "bomb",
  "4": "scroll",
  t: "chat", е: "chat",
  h: "help", р: "help", "?": "help",
  o: "settings", щ: "settings",
};

const SPECIAL_BINDINGS: Readonly<Partial<Record<Key["type"], Action>>> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  enter: "confirm",
  esc: "back",
};

export function actionFor(key: Key): Action | null {
  if (key.type === "char") return CHAR_BINDINGS[key.ch.toLowerCase()] ?? null;
  return SPECIAL_BINDINGS[key.type] ?? null;
}

/** A single-line text field used by the login prompt and the chat. */
export class LineEditor {
  private chars: string[] = [];

  constructor(private readonly maxLength: number) {}

  get value(): string {
    return this.chars.join("");
  }

  /** Applies an editing key; returns false if the key is not an edit. */
  edit(key: Key): boolean {
    if (key.type === "backspace") {
      this.chars.pop();
      return true;
    }
    if (key.type === "char") {
      if (this.chars.length < this.maxLength) this.chars.push(key.ch);
      return true;
    }
    return false;
  }

  /** Returns the trimmed value and clears the field. */
  take(): string {
    const value = this.value.trim();
    this.clear();
    return value;
  }

  clear(): void {
    this.chars = [];
  }
}
