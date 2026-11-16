import { en } from "./locales/en";
import { uk } from "./locales/uk";
import type { Dictionary, Message, MessageKey, MessageParam } from "./Message";

export const LOCALES = ["en", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

const DICTIONARIES: Record<Locale, Dictionary> = { en, uk };
const PLACEHOLDER = /\{(\w+)\}/g;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Turns message keys into text for one locale. Instances are shared per locale. */
export class Translator {
  private static readonly instances = new Map<Locale, Translator>();

  static for(locale: Locale): Translator {
    let instance = this.instances.get(locale);
    if (!instance) {
      instance = new Translator(locale);
      this.instances.set(locale, instance);
    }
    return instance;
  }

  private readonly dictionary: Dictionary;

  private constructor(readonly locale: Locale) {
    this.dictionary = DICTIONARIES[locale];
  }

  /** Translates a key, filling `{placeholders}` from `params`. */
  t(key: MessageKey, params?: Readonly<Record<string, MessageParam>>): string {
    const template = this.dictionary[key] ?? en[key];
    if (!params) return template;
    return template.replace(PLACEHOLDER, (match, name: string) => {
      const value = params[name];
      return value === undefined ? match : this.param(value);
    });
  }

  format(message: Message): string {
    return this.t(message.key, message.params);
  }

  private param(value: MessageParam): string {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map((m: Message) => this.format(m)).join(", ");
    return this.format(value as Message);
  }
}
