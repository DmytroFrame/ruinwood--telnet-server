import { Directions } from "../../core/Direction";
import type { Player } from "../../game/Player";
import type { PlayerSettings } from "../../game/PlayerSettings";
import { msg } from "../../i18n/Message";
import type { Key } from "../../net/KeyParser";
import { actionFor, LineEditor, type Action } from "../input";
import { textWidth, type Screen } from "../Screen";
import { Palette } from "../theme";
import { HelpOverlay } from "../widgets/HelpOverlay";
import { Hotbar } from "../widgets/Hotbar";
import { HUD_HEIGHT, HudPanel } from "../widgets/HudPanel";
import { LogView } from "../widgets/LogView";
import { MapView } from "../widgets/MapView";
import { SettingsMenu } from "../widgets/SettingsMenu";
import { SIDEBAR_WIDTH, Sidebar } from "../widgets/Sidebar";
import { StatusBar } from "../widgets/StatusBar";
import type { FrameContext, Rect } from "../widgets/Widget";
import type { Scene, SceneHost } from "./Scene";

type Mode = "play" | "chat" | "help" | "settings";

const CHAT_MAX = 120;
/** In "auto" mode the side panel appears from this terminal width. */
const SIDEBAR_AUTO_COLS = 100;
const MIN_MAP_COLS = 30;
const INLINE_LOG_LINES = 3;

/** The in-game screen: HUD, map, hotbar, sidebar or inline log, plus modal overlays. */
export class PlayScene implements Scene {
  private mode: Mode = "play";
  private readonly chat = new LineEditor(CHAT_MAX);
  private readonly hud = new HudPanel();
  private readonly map = new MapView();
  private readonly hotbar = new Hotbar();
  private readonly sidebar = new Sidebar();
  private readonly inlineLog = new LogView();
  private readonly statusBar = new StatusBar();
  private readonly help = new HelpOverlay();
  private readonly settings: SettingsMenu;

  constructor(
    private readonly host: SceneHost,
    private readonly player: Player,
  ) {
    this.settings = new SettingsMenu((field) => this.onSettingChanged(field));
  }

  // ───────────────────────── Input ─────────────────────────

  handleKey(key: Key): void {
    switch (this.mode) {
      case "chat":
        return this.handleChatKey(key);
      case "help":
        this.mode = "play";
        return;
      case "settings":
        if (!this.settings.handle(actionFor(key), this.player.settings)) this.mode = "play";
        return;
      case "play":
        return this.handleAction(actionFor(key));
    }
  }

  private handleAction(action: Action | null): void {
    const { game } = this.host;
    const p = this.player;
    switch (action) {
      case "up":
      case "down":
      case "left":
      case "right":
        return game.move(p, Directions[action]);
      case "attack":
        return game.attack(p);
      case "potion":
        return game.drinkPotion(p);
      case "bomb":
        return game.throwBomb(p);
      case "scroll":
        return game.readScroll(p);
      case "chat":
        this.chat.clear();
        this.mode = "chat";
        return;
      case "help":
        this.mode = "help";
        return;
      case "settings":
      case "back":
        this.mode = "settings";
        return;
    }
  }

  private handleChatKey(key: Key): void {
    if (key.type === "esc") {
      this.chat.clear();
      this.mode = "play";
      return;
    }
    if (key.type !== "enter") {
      this.chat.edit(key);
      return;
    }
    this.mode = "play";
    const text = this.chat.take();
    if (!text) return;
    if (text === "/quit") return this.host.quit();
    if (text === "/who") return this.host.game.listPlayers(this.player);
    this.host.game.chat(this.player, text);
  }

  private onSettingChanged(field: keyof PlayerSettings): void {
    if (field === "sound" && this.player.settings.sound) {
      this.player.notify(msg("event.soundOn"), Palette.dim);
      this.host.ring();
    }
  }

  // ───────────────────────── Rendering ─────────────────────────

  draw(scr: Screen): void {
    const ctx: FrameContext = {
      game: this.host.game,
      player: this.player,
      t: this.host.translator,
      tick: this.host.game.tick,
    };
    const sidebarW = this.sidebarWidth(scr.w);
    const logLines = sidebarW ? 0 : INLINE_LOG_LINES;
    const map: Rect = { x: 0, y: HUD_HEIGHT, w: scr.w - sidebarW, h: scr.h - HUD_HEIGHT - 2 - logLines };
    const hotbarY = map.y + map.h;

    this.hud.draw(scr, ctx);
    this.map.draw(scr, ctx, map);
    this.hotbar.draw(scr, ctx, hotbarY, map.w);
    if (sidebarW) this.sidebar.draw(scr, ctx, { x: map.w, y: map.y, w: sidebarW, h: map.h + 1 });
    else this.inlineLog.draw(scr, ctx, 1, hotbarY + 1, scr.w - 2, logLines);
    this.statusBar.draw(scr, ctx, this.mode === "chat" ? this.chat.value : null);

    if (this.player.dead) this.drawDeathBanner(scr, ctx, map);
    if (this.mode === "help") this.help.draw(scr, ctx, map);
    if (this.mode === "settings") this.settings.draw(scr, ctx, map);
  }

  private sidebarWidth(cols: number): number {
    switch (this.player.settings.sidebar) {
      case "auto":
        return cols >= SIDEBAR_AUTO_COLS ? SIDEBAR_WIDTH : 0;
      case "always":
        return cols - SIDEBAR_WIDTH >= MIN_MAP_COLS ? SIDEBAR_WIDTH : 0;
      case "never":
        return 0;
    }
  }

  private drawDeathBanner(scr: Screen, { game, player, t, tick }: FrameContext, map: Rect): void {
    const ticksPerSecond = 1000 / game.tickMs;
    const seconds = Math.max(0, Math.ceil((player.respawnAt - tick) / ticksPerSecond));
    const text = t.t("hud.dead", { seconds });
    const x = map.x + Math.max(0, Math.floor((map.w - textWidth(text)) / 2));
    scr.text(x, map.y + Math.floor(map.h / 2), text, Palette.bright, Palette.deathBanner, true);
  }
}
