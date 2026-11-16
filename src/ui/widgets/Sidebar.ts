import { clip, type Screen } from "../Screen";
import { Palette } from "../theme";
import { LogView } from "./LogView";
import type { FrameContext, Rect } from "./Widget";

export const SIDEBAR_WIDTH = 32;

const ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
const MAX_LISTED_PLAYERS = 8;

/** Right panel: online players with direction and distance, then the event log. */
export class Sidebar {
  private readonly log = new LogView();

  draw(scr: Screen, ctx: FrameContext, area: Rect): void {
    const bg = Palette.sidebar;
    scr.fillRect(area.x, area.y, area.w, area.h, bg);
    for (let y = area.y; y < area.y + area.h; y++) scr.put(area.x, y, "│", Palette.frame, bg);

    const x = area.x + 2;
    let y = this.drawPlayers(scr, ctx, x, area.y, area.h);
    y++;
    scr.text(x, y++, ctx.t.t("sidebar.events"), Palette.accent, bg, true);
    const room = area.y + area.h - y;
    if (room > 0) this.log.draw(scr, ctx, x, y, area.w - 3, room, bg);
  }

  /** Returns the next free row. */
  private drawPlayers(scr: Screen, { game, player: me, t }: FrameContext, x: number, y: number, height: number): number {
    const bg = Palette.sidebar;
    const players = [me, ...[...game.players].filter((p) => p !== me)];
    const shown = Math.min(MAX_LISTED_PLAYERS, Math.floor(height / 3));

    scr.text(x, y++, t.t("sidebar.players", { count: players.length }), Palette.accent, bg, true);
    for (const p of players.slice(0, shown)) {
      const isMe = p === me;
      const color = isMe ? Palette.bright : p.color;
      const after = scr.text(x, y, p.dead ? "✝" : "@", color, bg, true);
      scr.text(after + 1, y, clip(p.name, 12), color, bg, isMe);
      scr.text(x + 15, y, t.t("sidebar.level", { level: p.level }), Palette.dim, bg);
      if (isMe) {
        scr.text(x + 21, y, t.t("sidebar.you"), Palette.frame, bg);
      } else {
        const angle = Math.atan2(p.y - me.y, p.x - me.x);
        const arrow = ARROWS[(Math.round(angle / (Math.PI / 4)) + 8) % 8]!;
        scr.text(x + 21, y, `${arrow}${Math.round(Math.hypot(p.x - me.x, p.y - me.y))}`, Palette.text, bg);
      }
      y++;
    }
    if (players.length > shown) scr.text(x, y++, t.t("sidebar.more", { count: players.length - shown }), Palette.dim, bg);
    return y;
  }
}
