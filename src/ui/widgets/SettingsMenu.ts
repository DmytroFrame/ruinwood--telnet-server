import { CAMERA_MODES, SIDEBAR_MODES, type PlayerSettings } from "../../game/PlayerSettings";
import type { MessageKey } from "../../i18n/Message";
import { LOCALES, Translator } from "../../i18n/Translator";
import { clip, textWidth, type Screen } from "../Screen";
import type { Action } from "../input";
import { Palette } from "../theme";
import type { FrameContext, Rect } from "./Widget";

type SettingField = keyof PlayerSettings;

interface MenuOption {
  readonly field: SettingField;
  readonly label: MessageKey;
  valueText(settings: PlayerSettings, t: Translator): string;
  cycle(settings: PlayerSettings, delta: number): void;
}

/** One row of the menu: a settings field cycling through a fixed list of values. */
class SettingOption<K extends SettingField> implements MenuOption {
  constructor(
    readonly field: K,
    readonly label: MessageKey,
    private readonly values: readonly PlayerSettings[K][],
    private readonly describe: (value: PlayerSettings[K], t: Translator) => string,
  ) {}

  valueText(settings: PlayerSettings, t: Translator): string {
    return this.describe(settings[this.field], t);
  }

  cycle(settings: PlayerSettings, delta: number): void {
    const i = this.values.indexOf(settings[this.field]);
    const n = this.values.length;
    settings[this.field] = this.values[(i + delta + n) % n]!;
  }
}

const onOff = (value: boolean, t: Translator) => t.t(value ? "value.on" : "value.off");

const OPTIONS: readonly MenuOption[] = [
  // Each language is shown in its own name, so it is recognisable whatever the current one is.
  new SettingOption("locale", "settings.language", LOCALES, (v) => Translator.for(v).t("language.name")),
  new SettingOption("sound", "settings.sound", [true, false], onOff),
  new SettingOption("nameTags", "settings.nameTags", [true, false], onOff),
  new SettingOption("sidebar", "settings.sidebar", SIDEBAR_MODES, (v, t) => t.t(`value.${v}`)),
  new SettingOption("camera", "settings.camera", CAMERA_MODES, (v, t) => t.t(`value.${v}`)),
];

const MAX_WIDTH = 46;

/** In-game settings menu, navigated with arrows/WASD; changes apply immediately. */
export class SettingsMenu {
  private selected = 0;

  constructor(private readonly onChange: (field: SettingField) => void) {}

  /** Handles a key action; returns false when the menu should close. */
  handle(action: Action | null, settings: PlayerSettings): boolean {
    const option = OPTIONS[this.selected]!;
    switch (action) {
      case "up":
        this.selected = (this.selected - 1 + OPTIONS.length) % OPTIONS.length;
        break;
      case "down":
        this.selected = (this.selected + 1) % OPTIONS.length;
        break;
      case "left":
        this.change(option, settings, -1);
        break;
      case "right":
      case "confirm":
      case "attack":
        this.change(option, settings, 1);
        break;
      case "back":
      case "settings":
        return false;
    }
    return true;
  }

  draw(scr: Screen, { player, t }: FrameContext, area: Rect): void {
    const w = Math.min(area.w - 2, MAX_WIDTH);
    const h = OPTIONS.length + 6;
    const x0 = area.x + Math.floor((area.w - w) / 2);
    const y0 = area.y + Math.max(0, Math.floor((area.h - h) / 2));
    const bg = Palette.overlay;
    scr.fillRect(x0, y0, w, Math.min(h, area.h), bg);

    scr.text(x0 + 2, y0 + 1, t.t("settings.title"), Palette.key, bg, true);
    OPTIONS.forEach((option, i) => {
      const y = y0 + 3 + i;
      const active = i === this.selected;
      const rowBg = active ? Palette.overlaySelected : bg;
      scr.fillRect(x0 + 1, y, w - 2, 1, rowBg);

      const value = `◀ ${option.valueText(player.settings, t)} ▶`;
      const valueX = x0 + w - 2 - textWidth(value);
      scr.text(x0 + 2, y, clip(t.t(option.label), Math.max(1, valueX - x0 - 3)), active ? Palette.bright : Palette.text, rowBg, active);
      scr.text(valueX, y, value, active ? Palette.key : Palette.accent, rowBg, active);
    });
    scr.text(x0 + 2, y0 + h - 2, clip(t.t("settings.hint"), w - 4), Palette.dim, bg);
  }

  private change(option: MenuOption, settings: PlayerSettings, delta: number): void {
    option.cycle(settings, delta);
    this.onChange(option.field);
  }
}
