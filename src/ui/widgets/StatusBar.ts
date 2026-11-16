import type { MessageKey } from "../../i18n/Message";
import { textWidth, type Screen } from "../Screen";
import { Palette } from "../theme";
import type { FrameContext } from "./Widget";

/** Key label (literal or translated) and the action it triggers. */
const HINTS: readonly [label: string | MessageKey, action: MessageKey][] = [
  ["WASD", "hint.move"],
  ["key.space", "hint.attack"],
  ["1-4", "hint.items"],
  ["T", "hint.chat"],
  ["O", "hint.settings"],
  ["H", "hint.help"],
  ["Ctrl+C", "hint.quit"],
];

/** Bottom row: key hints, or the chat input line while typing. */
export class StatusBar {
  draw(scr: Screen, ctx: FrameContext, chatInput: string | null): void {
    const y = scr.h - 1;
    scr.fillRow(y, Palette.panel);
    if (chatInput === null) this.drawHints(scr, ctx, y);
    else this.drawChat(scr, ctx, y, chatInput);
  }

  private drawHints(scr: Screen, { t }: FrameContext, y: number): void {
    let x = 1;
    for (const [label, action] of HINTS) {
      const key = label.startsWith("key.") ? t.t(label as MessageKey) : label;
      const text = t.t(action);
      if (x + textWidth(key) + textWidth(text) + 3 > scr.w) break;
      x = scr.text(x, y, key, Palette.key, Palette.panel, true);
      x = scr.text(x + 1, y, text, Palette.dim, Palette.panel) + 2;
    }
  }

  private drawChat(scr: Screen, { t }: FrameContext, y: number, input: string): void {
    const prompt = t.t("chat.prompt");
    const visible = [...input].slice(-(scr.w - textWidth(prompt) - 4)).join("");
    let x = scr.text(1, y, prompt, Palette.accent, Palette.panel, true);
    x = scr.text(x, y, visible + "▏", Palette.bright, Palette.panel);
    scr.text(x, y, t.t("chat.hint"), Palette.frame, Palette.panel);
  }
}
