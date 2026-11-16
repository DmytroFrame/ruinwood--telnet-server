import type { MessageKey } from "../../i18n/Message";
import { clip, type Screen } from "../Screen";
import { Palette } from "../theme";
import type { FrameContext, Rect } from "./Widget";

/** `null` is an empty line. */
const LINES: readonly (MessageKey | null)[] = [
  "help.title",
  null,
  "help.move",
  "help.attack",
  "help.potion",
  "help.bomb",
  "help.scroll",
  "help.chat",
  "help.settings",
  "help.help",
  "help.quit",
  null,
  "help.legendMobs",
  "help.legendItems",
  "help.legendCamp",
  null,
  "help.close",
];

const MAX_WIDTH = 50;

/** Controls and map legend, centered over the map. */
export class HelpOverlay {
  draw(scr: Screen, { t }: FrameContext, area: Rect): void {
    const w = Math.min(area.w - 2, MAX_WIDTH);
    const h = Math.min(area.h, LINES.length + 2);
    const x0 = area.x + Math.floor((area.w - w) / 2);
    const y0 = area.y + Math.max(0, Math.floor((area.h - h) / 2));
    scr.fillRect(x0, y0, w, h, Palette.overlay);

    LINES.forEach((key, i) => {
      if (!key || i + 1 >= h) return;
      const isTitle = i === 0;
      scr.text(x0 + 2, y0 + 1 + i, clip(t.t(key), w - 4), isTitle ? Palette.key : Palette.text, Palette.overlay, isTitle);
    });
  }
}
