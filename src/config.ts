import { isLocale, type Locale } from "./i18n/Translator";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  /** Explicit world seed; otherwise taken from `data/world.json` or generated. */
  readonly seed: number | undefined;
  readonly dataDir: string;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly tickMs: number;
  readonly autosaveTicks: number;
  readonly maxPlayers: number;
  /** Language of the title screen and of new players. */
  readonly defaultLocale: Locale;
}

/** The standard telnet port (RFC 854), so clients can connect without specifying one. */
export const TELNET_PORT = 23;

type Env = Record<string, string | undefined>;

function intFromEnv(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer, got "${raw}"`);
  return value;
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const locale = env.DEFAULT_LOCALE ?? "en";
  if (!isLocale(locale)) throw new Error(`DEFAULT_LOCALE must be one of en, uk; got "${locale}"`);
  return {
    host: env.HOST ?? "0.0.0.0",
    port: intFromEnv(env, "PORT", TELNET_PORT),
    seed: env.SEED ? intFromEnv(env, "SEED", 0) : undefined,
    dataDir: env.DATA_DIR ?? "data",
    worldWidth: 320,
    worldHeight: 180,
    tickMs: 100,
    autosaveTicks: 300,
    maxPlayers: intFromEnv(env, "MAX_PLAYERS", 32),
    defaultLocale: locale,
  };
}
