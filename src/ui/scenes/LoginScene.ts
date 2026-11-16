import type { MessageKey } from "../../i18n/Message";
import type { Key } from "../../net/KeyParser";
import { LineEditor } from "../input";
import { textWidth, type Screen } from "../Screen";
import { Palette } from "../theme";
import type { Scene, SceneHost } from "./Scene";

const NAME_PATTERN = /^[\p{L}\p{N}_-]{2,16}$/u;
const NAME_MAX = 16;

const LOGO_LETTERS: Readonly<Record<string, readonly [string, string, string]>> = {
  R: ["╦═╗", "╠╦╝", "╩╚═"],
  U: ["╦ ╦", "║ ║", "╚═╝"],
  I: ["╦", "║", "╩"],
  N: ["╔╗╔", "║║║", "╝╚╝"],
  W: ["╦ ╦", "║║║", "╚╩╝"],
  O: ["╔═╗", "║ ║", "╚═╝"],
  D: ["╔╦╗", " ║║", "═╩╝"],
};
const LOGO = [0, 1, 2].map((row) => [..."RUINWOOD"].map((c) => LOGO_LETTERS[c]![row]).join(""));

/** Title screen with the name prompt and a language switch. */
export class LoginScene implements Scene {
  private readonly name = new LineEditor(NAME_MAX);
  private error: MessageKey | null = null;

  constructor(private readonly host: SceneHost) {}

  handleKey(key: Key): void {
    if (key.type === "tab") return this.host.cycleLocale();
    if (key.type !== "enter") {
      this.name.edit(key);
      return;
    }
    const name = this.name.take();
    if (!NAME_PATTERN.test(name)) this.error = "login.invalidName";
    else if (this.host.game.isOnline(name)) this.error = "login.nameTaken";
    else this.host.enterGame(name);
  }

  draw(scr: Screen): void {
    const t = this.host.translator;
    let y = Math.max(1, Math.floor(scr.h / 2) - 8);
    for (const row of LOGO) scr.centered(y++, row, Palette.title, -1, true);
    y++;
    scr.centered(y++, t.t("game.tagline"), Palette.tagline);
    y += 2;

    const prompt = t.t("login.prompt");
    const x = Math.max(0, Math.floor((scr.w - textWidth(prompt) - NAME_MAX) / 2));
    scr.text(scr.text(x, y, prompt, Palette.text), y, this.name.value + "▏", Palette.bright, -1, true);
    y += 2;
    if (this.error) scr.centered(y, t.t(this.error), Palette.danger);
    y += 2;

    scr.centered(y++, t.t("login.online", { count: this.host.game.playerCount }), Palette.dim);
    scr.centered(y++, t.t("login.tip"), Palette.frame);
    scr.centered(y, t.t("login.language", { language: t.t("language.name") }), Palette.accent);
  }
}
