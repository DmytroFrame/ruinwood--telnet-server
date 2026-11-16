import { wrapText, type Screen } from "../Screen";
import type { FrameContext } from "./Widget";

interface WrappedLine {
  readonly text: string;
  readonly color: number;
}

/**
 * Renders the newest entries of the player's event log. Translation and word-wrapping
 * are cached until the log, the language or the available size changes.
 */
export class LogView {
  private cacheKey = "";
  private cache: readonly WrappedLine[] = [];

  draw(scr: Screen, ctx: FrameContext, x: number, y: number, width: number, height: number, bg = -1): void {
    for (const line of this.lines(ctx, width, height)) scr.text(x, y++, line.text, line.color, bg);
  }

  private lines({ player, t }: FrameContext, width: number, height: number): readonly WrappedLine[] {
    const key = `${player.log.revision}:${t.locale}:${width}:${height}`;
    if (key === this.cacheKey) return this.cache;

    const wrapped: WrappedLine[] = [];
    for (const entry of player.log.tail(height)) {
      for (const text of wrapText(t.format(entry.message), width)) wrapped.push({ text, color: entry.color });
    }
    this.cacheKey = key;
    this.cache = wrapped.slice(-height);
    return this.cache;
  }
}
