import { Rules, xpToNext } from "../../game/rules";
import { progressBar, textWidth, type Screen } from "../Screen";
import { Palette } from "../theme";
import type { FrameContext } from "./Widget";

export const HUD_HEIGHT = 4;

/** Framed top panel: health, level and XP, gold, attack, zone and the current target. */
export class HudPanel {
  draw(scr: Screen, ctx: FrameContext): void {
    this.drawFrame(scr, ctx);
    this.drawStats(scr, ctx, 1);
    this.drawLocation(scr, ctx, 2);
  }

  private drawFrame(scr: Screen, { game, player, t }: FrameContext): void {
    const w = scr.w;
    const bottom = HUD_HEIGHT - 1;
    scr.fillRect(0, 0, w, HUD_HEIGHT, Palette.panel);
    scr.text(0, 0, "╭" + "─".repeat(w - 2) + "╮", Palette.frame, Palette.panel);
    scr.text(0, bottom, "╰" + "─".repeat(w - 2) + "╯", Palette.frame, Palette.panel);
    for (let y = 1; y < bottom; y++) {
      scr.put(0, y, "│", Palette.frame, Palette.panel);
      scr.put(w - 1, y, "│", Palette.frame, Palette.panel);
    }
    scr.text(2, 0, ` ${t.t("game.title")} `, Palette.title, Palette.panel, true);
    const right = ` ${player.settings.sound ? "♪ · " : ""}${t.t("hud.online", { count: game.playerCount })} `;
    scr.text(w - 2 - textWidth(right), 0, right, Palette.dim, Palette.panel);
  }

  private drawStats(scr: Screen, { player: p, t }: FrameContext, y: number): void {
    const bg = Palette.panel;
    let x = scr.text(2, y, "HP ", Palette.dim, bg);
    const hearts = Math.ceil(p.maxHp / Rules.hpPerHeart);
    for (let i = 0; i < hearts; i++) {
      const fill = p.hp - i * Rules.hpPerHeart;
      const color = fill >= Rules.hpPerHeart ? Palette.hpFull : fill > 0 ? Palette.hpPartial : Palette.hpEmpty;
      x = scr.text(x, y, "♥", color, bg);
    }
    const low = p.isLowHp;
    x = scr.text(x + 1, y, `${p.hp}/${p.maxHp}`, low ? Palette.danger : Palette.text, bg, low);

    const need = xpToNext(p.level);
    x = scr.text(x + 3, y, t.t("hud.level", { level: p.level }), Palette.key, bg, true);
    x = scr.text(x, y, progressBar(p.xp, need, 12), Palette.xp, bg);
    x = scr.text(x + 1, y, `${p.xp}/${need}`, Palette.dim, bg);
    x = scr.text(x + 3, y, `$ ${p.gold}`, Palette.gold, bg, true);
    scr.text(x + 3, y, `† ${p.attack}`, Palette.text, bg);
  }

  private drawLocation(scr: Screen, { game, player: p, t, tick }: FrameContext, y: number): void {
    const bg = Palette.panel;
    const zone = t.t("hud.zone", {
      zone: t.t(game.world.info(p.x, p.y).zone),
      danger: game.world.danger(p.x, p.y),
      x: p.x,
      y: p.y,
    });
    let x = scr.text(2, y, zone, Palette.tagline, bg);

    const mob = p.target;
    if (!mob || tick >= p.targetUntil || mob.isDead) return;
    x = scr.text(x + 3, y, t.t("hud.target", { mob: t.t(mob.kind.name), level: mob.level }), mob.kind.color, bg, true);
    x = scr.text(x, y, progressBar(mob.hp, mob.maxHp, 10), 160, bg);
    scr.text(x, y, ` ${Math.max(0, mob.hp)}/${mob.maxHp}`, Palette.dim, bg);
  }
}
