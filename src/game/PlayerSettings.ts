import { isLocale, type Locale } from "../i18n/Translator";

export const SIDEBAR_MODES = ["auto", "always", "never"] as const;
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

export const CAMERA_MODES = ["smooth", "centered"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

/** Per-player client preferences, saved together with the character. */
export interface PlayerSettings {
  locale: Locale;
  sound: boolean;
  nameTags: boolean;
  sidebar: SidebarMode;
  camera: CameraMode;
}

export function defaultSettings(locale: Locale): PlayerSettings {
  return { locale, sound: true, nameTags: true, sidebar: "auto", camera: "smooth" };
}

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/** Validates settings loaded from disk, falling back to defaults for anything unknown. */
export function normalizeSettings(raw: Partial<PlayerSettings> | undefined, fallback: PlayerSettings): PlayerSettings {
  if (!raw) return { ...fallback };
  return {
    locale: isLocale(raw.locale) ? raw.locale : fallback.locale,
    sound: typeof raw.sound === "boolean" ? raw.sound : fallback.sound,
    nameTags: typeof raw.nameTags === "boolean" ? raw.nameTags : fallback.nameTags,
    sidebar: oneOf(SIDEBAR_MODES, raw.sidebar, fallback.sidebar),
    camera: oneOf(CAMERA_MODES, raw.camera, fallback.camera),
  };
}
