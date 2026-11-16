import type { Game } from "../../game/Game";
import type { Translator } from "../../i18n/Translator";
import type { Key } from "../../net/KeyParser";
import type { Screen } from "../Screen";

/** A full-screen state of a session (login, playing). */
export interface Scene {
  handleKey(key: Key): void;
  draw(screen: Screen): void;
}

/** What scenes may ask of the session that hosts them. */
export interface SceneHost {
  readonly game: Game;
  readonly translator: Translator;
  /** Switches the pre-login language to the next one. */
  cycleLocale(): void;
  enterGame(name: string): void;
  ring(): void;
  quit(): void;
}
