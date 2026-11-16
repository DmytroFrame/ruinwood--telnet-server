import type { en } from "./locales/en";

export type MessageKey = keyof typeof en;
export type Dictionary = Readonly<Record<MessageKey, string>>;

export type MessageParam = string | number | Message | readonly Message[];

/**
 * A translatable message: a dictionary key plus interpolation params.
 * The game stores messages instead of finished strings, so each player sees them in
 * their own language, and switching languages re-translates the existing event log.
 */
export interface Message {
  readonly key: MessageKey;
  readonly params?: Readonly<Record<string, MessageParam>>;
}

export function msg(key: MessageKey, params?: Record<string, MessageParam>): Message {
  return params ? { key, params } : { key };
}
