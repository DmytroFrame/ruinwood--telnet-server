import type { Game } from "../../game/Game";
import type { Player } from "../../game/Player";
import type { Translator } from "../../i18n/Translator";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Everything a widget needs to draw one frame for one player. */
export interface FrameContext {
  readonly game: Game;
  readonly player: Player;
  readonly t: Translator;
  readonly tick: number;
}
