import type { Socket } from "bun";
import type { Game } from "../game/Game";
import type { Player } from "../game/Player";
import { defaultSettings } from "../game/PlayerSettings";
import type { MessageKey } from "../i18n/Message";
import { LOCALES, Translator, type Locale } from "../i18n/Translator";
import { Connection } from "../net/Connection";
import type { WindowSize } from "../net/TelnetParser";
import { LoginScene } from "./scenes/LoginScene";
import { PlayScene } from "./scenes/PlayScene";
import type { Scene, SceneHost } from "./scenes/Scene";
import { Screen } from "./Screen";
import { Palette } from "./theme";

const MIN_COLS = 50;
const MIN_ROWS = 18;
const MAX_COLS = 300;
const MAX_ROWS = 120;
const BELL_COOLDOWN_TICKS = 5;

const ANSI = {
  reset: "\x1b[0m",
  clear: "\x1b[2J",
  home: "\x1b[H",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearToEol: "\x1b[K",
  bell: "\x07",
  moveTo: (row: number, col: number) => `\x1b[${row};${col}H`,
} as const;

/**
 * One connected client: routes input to the active scene and sends frames as diffs,
 * re-sending only the rows that changed since the previous frame.
 */
export class Session implements SceneHost {
  private readonly connection: Connection<Session>;
  private readonly screen = new Screen(80, 24);
  private scene: Scene;
  private player: Player | null = null;
  private loginLocale: Locale;
  private localeChosen = false;

  private cols = 80;
  private rows = 24;
  private lastLines: string[] = [];
  private fullRedraw = true;
  private seenAlerts = 0;
  private lastBell = -Infinity;

  constructor(
    socket: Socket<Session>,
    readonly game: Game,
    defaultLocale: Locale,
  ) {
    this.connection = new Connection(socket);
    this.loginLocale = defaultLocale;
    this.scene = new LoginScene(this);
  }

  get translator(): Translator {
    return Translator.for(this.player?.settings.locale ?? this.loginLocale);
  }

  start(): void {
    this.connection.open();
    this.connection.write(ANSI.hideCursor + ANSI.clear);
    this.render();
  }

  // ───────────────────────── Socket events ─────────────────────────

  onData(chunk: Uint8Array): void {
    const input = this.connection.decode(chunk);
    if (input.size) this.resize(input.size);
    if (input.interrupt) return this.quit();

    for (const key of input.keys) {
      if (this.connection.isClosed) return;
      if (key.type === "quit") return this.quit();
      this.scene.handleKey(key);
    }
    this.render();
  }

  onDrain(): void {
    this.connection.flush();
  }

  onClose(): void {
    this.connection.markClosed();
    if (this.player) this.game.leave(this.player);
    this.player = null;
  }

  /** Clears the client's screen, prints a farewell and disconnects. */
  quit(reason: MessageKey = "session.bye"): void {
    if (this.connection.isClosed) return;
    const text = this.translator.t(reason);
    this.connection.end(`${ANSI.reset}${ANSI.clear}${ANSI.home}${ANSI.showCursor}${text}\r\n`);
  }

  // ───────────────────────── SceneHost ─────────────────────────

  cycleLocale(): void {
    this.loginLocale = LOCALES[(LOCALES.indexOf(this.loginLocale) + 1) % LOCALES.length]!;
    this.localeChosen = true;
  }

  enterGame(name: string): void {
    const player = this.game.join(name, defaultSettings(this.loginLocale));
    // A language picked explicitly on the title screen beats the saved one.
    if (this.localeChosen) player.settings.locale = this.loginLocale;
    this.player = player;
    this.seenAlerts = player.alerts;
    this.scene = new PlayScene(this, player);
    this.fullRedraw = true;
  }

  ring(): void {
    this.connection.write(ANSI.bell);
  }

  // ───────────────────────── Rendering ─────────────────────────

  render(): void {
    // A client that can't keep up skips frames instead of growing the backlog.
    if (this.connection.isClosed || this.connection.isCongested) return;

    // The last column stays empty so the terminal never wraps a full row.
    const scr = this.screen;
    scr.resize(this.cols - 1, this.rows);
    scr.clear();
    if (this.cols < MIN_COLS || this.rows < MIN_ROWS) {
      const params = { cols: this.cols, rows: this.rows, minCols: MIN_COLS, minRows: MIN_ROWS };
      scr.text(0, 0, this.translator.t("session.windowTooSmall", params), Palette.warning);
    } else {
      this.scene.draw(scr);
    }

    let out = "";
    if (this.fullRedraw) {
      out += ANSI.reset + ANSI.clear;
      this.lastLines = [];
      this.fullRedraw = false;
    }
    for (let y = 0; y < scr.h; y++) {
      const line = scr.line(y);
      if (line === this.lastLines[y]) continue;
      this.lastLines[y] = line;
      out += ANSI.moveTo(y + 1, 1) + line + ANSI.reset + ANSI.clearToEol;
    }
    out += this.pendingBell();
    if (out) this.connection.write(out);
  }

  private resize(size: WindowSize): void {
    this.cols = Math.max(20, Math.min(MAX_COLS, size.cols || 80));
    this.rows = Math.max(10, Math.min(MAX_ROWS, size.rows || 24));
    this.fullRedraw = true;
  }

  /** Sound is the BEL character; the terminal plays its system beep. */
  private pendingBell(): string {
    const p = this.player;
    if (!p || p.alerts === this.seenAlerts) return "";
    this.seenAlerts = p.alerts;
    if (!p.settings.sound || this.game.tick - this.lastBell < BELL_COOLDOWN_TICKS) return "";
    this.lastBell = this.game.tick;
    return ANSI.bell;
  }
}
