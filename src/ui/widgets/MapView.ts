import { ITEM_LOOK } from "../../game/GroundItems";
import type { Player } from "../../game/Player";
import { TILES } from "../../world/tiles";
import { clip, textWidth, type Screen } from "../Screen";
import { Palette } from "../theme";
import type { FrameContext, Rect } from "./Widget";

const HURT_BG = 124;
const NAME_TAG_BG = 234;

/**
 * The world viewport. Draws terrain first, then overlays entities by iterating the
 * (few) entities instead of probing every cell for chests, items, mobs and players.
 */
export class MapView {
  private camX = 0;
  private camY = 0;
  private viewW = -1;
  private viewH = -1;
  /** Cells covered by an entity; name tags never hide them. */
  private occupied = new Uint8Array(0);

  draw(scr: Screen, ctx: FrameContext, area: Rect): void {
    this.updateCamera(ctx, area);
    this.occupied.fill(0);
    this.drawTerrain(scr, ctx, area);
    this.drawEntities(scr, ctx, area);
    this.drawExplosions(scr, ctx, area);
    this.drawSlashes(scr, ctx, area);
    if (ctx.player.settings.nameTags) this.drawNameTags(scr, ctx, area);
  }

  /**
   * "Smooth" moves the camera only when the player nears the edge (less redraw traffic);
   * "centered" keeps the player in the middle. Both snap after a resize or teleport.
   */
  private updateCamera({ game, player: p }: FrameContext, area: Rect): void {
    const resized = area.w !== this.viewW || area.h !== this.viewH;
    if (resized) {
      this.viewW = area.w;
      this.viewH = area.h;
      this.occupied = new Uint8Array(area.w * area.h);
    }
    const centered = resized || p.settings.camera === "centered";
    const marginX = Math.floor(area.w / 4);
    const marginY = Math.floor(area.h / 4);
    const relX = p.x - this.camX;
    const relY = p.y - this.camY;
    if (centered || relX < marginX || relX >= area.w - marginX) this.camX = p.x - Math.floor(area.w / 2);
    if (centered || relY < marginY || relY >= area.h - marginY) this.camY = p.y - Math.floor(area.h / 2);
    this.camX = Math.max(0, Math.min(game.world.width - area.w, this.camX));
    this.camY = Math.max(0, Math.min(game.world.height - area.h, this.camY));
  }

  private drawTerrain(scr: Screen, { game }: FrameContext, area: Rect): void {
    const world = game.world;
    for (let sy = 0; sy < area.h; sy++) {
      const y = this.camY + sy;
      for (let sx = 0; sx < area.w; sx++) {
        const x = this.camX + sx;
        if (!world.inBounds(x, y)) {
          scr.put(area.x + sx, area.y + sy, " ", -1, Palette.outOfMap);
          continue;
        }
        const tile = TILES[world.tiles[world.key(x, y)]!]!;
        scr.put(area.x + sx, area.y + sy, tile.glyph, tile.fg, tile.bg);
      }
    }
  }

  private drawEntities(scr: Screen, ctx: FrameContext, area: Rect): void {
    const { game, player, tick } = ctx;
    const world = game.world;

    for (const chest of world.chests.values()) {
      if (chest.isOpen) this.paint(scr, ctx, area, chest.x, chest.y, "□", 240);
      else this.paint(scr, ctx, area, chest.x, chest.y, "■", 220);
    }
    for (const [key, item] of game.items) {
      const look = ITEM_LOOK[item.kind];
      this.paint(scr, ctx, area, key % world.width, Math.floor(key / world.width), look.glyph, look.color);
    }
    for (const mob of game.mobs) {
      const bg = tick < mob.hurtUntil ? HURT_BG : undefined;
      this.paint(scr, ctx, area, mob.x, mob.y, mob.kind.glyph, mob.kind.color, bg, true);
    }
    for (const other of game.players) {
      if (other === player || other.dead) continue;
      this.paint(scr, ctx, area, other.x, other.y, "@", tick < other.hurtUntil ? Palette.hpFull : other.color, undefined, true);
    }
    if (player.dead) this.paint(scr, ctx, area, player.x, player.y, "%", 160, undefined, true);
    else this.paint(scr, ctx, area, player.x, player.y, "@", tick < player.hurtUntil ? Palette.hpFull : Palette.bright, undefined, true);
  }

  /** Draws an entity glyph over the terrain at world (x, y), keeping the tile background. */
  private paint(scr: Screen, { game }: FrameContext, area: Rect, x: number, y: number, glyph: string, fg: number, bg?: number, bold = false): void {
    const sx = x - this.camX;
    const sy = y - this.camY;
    if (sx < 0 || sy < 0 || sx >= area.w || sy >= area.h) return;
    scr.put(area.x + sx, area.y + sy, glyph, fg, bg ?? game.world.info(x, y).bg, bold);
    this.occupied[sy * area.w + sx] = 1;
  }

  private drawExplosions(scr: Screen, { game, tick }: FrameContext, area: Rect): void {
    for (const e of game.explosions) {
      const strong = e.until - tick > 2;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const sx = e.x + dx - this.camX;
          const sy = e.y + dy - this.camY;
          if (sx < 0 || sy < 0 || sx >= area.w || sy >= area.h) continue;
          scr.put(area.x + sx, area.y + sy, strong ? "▓" : "░", strong ? 226 : 208, strong ? 202 : 52, true);
        }
      }
    }
  }

  private drawSlashes(scr: Screen, { game, tick }: FrameContext, area: Rect): void {
    for (const p of game.players) {
      if (p.dead || tick >= p.slashUntil) continue;
      const x = p.x + p.facing.dx;
      const y = p.y + p.facing.dy;
      const sx = x - this.camX;
      const sy = y - this.camY;
      if (sx < 0 || sy < 0 || sx >= area.w || sy >= area.h) continue;
      scr.put(area.x + sx, area.y + sy, p.facing.dx ? "─" : "│", Palette.bright, game.world.info(x, y).bg, true);
    }
  }

  /** Names above other players' heads, with "!" when they are low on health. */
  private drawNameTags(scr: Screen, { game, player }: FrameContext, area: Rect): void {
    for (const other of game.players) {
      if (other === player || other.dead) continue;
      const sx = other.x - this.camX;
      const sy = other.y - this.camY;
      if (sx < 0 || sy < 0 || sx >= area.w || sy >= area.h) continue;
      this.drawTag(scr, area, other, sx, sy > 0 ? sy - 1 : sy + 1);
    }
  }

  private drawTag(scr: Screen, area: Rect, other: Player, sx: number, ly: number): void {
    const label = clip(other.name, 12) + (other.isLowHp ? " !" : "");
    const width = textWidth(label);
    let lx = Math.max(0, Math.min(area.w - width, sx - Math.floor(width / 2)));
    for (const c of label) {
      if (lx < area.w && !this.occupied[ly * area.w + lx]) {
        scr.put(area.x + lx, area.y + ly, c, other.color, NAME_TAG_BG, true);
      }
      lx++;
    }
  }
}
