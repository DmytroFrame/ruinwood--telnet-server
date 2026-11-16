import { describe, expect, test } from "bun:test";
import { en } from "../src/i18n/locales/en";
import { uk } from "../src/i18n/locales/uk";
import { msg, type MessageKey } from "../src/i18n/Message";
import { LOCALES, Translator } from "../src/i18n/Translator";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  test("every locale uses the same placeholders as English", () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect({ key, vars: placeholders(uk[key]) }).toEqual({ key, vars: placeholders(en[key]) });
    }
  });

  test("every locale names itself differently", () => {
    const names = LOCALES.map((l) => Translator.for(l).t("language.name"));
    expect(new Set(names).size).toBe(LOCALES.length);
  });
});

describe("Translator", () => {
  test("interpolates params, nested messages and lists", () => {
    const loot = [msg("loot.gold", { amount: 5 }), msg("loot.potion")];
    expect(Translator.for("en").format(msg("event.chest", { loot }))).toBe("Chest: 5 gold, a potion.");
    expect(Translator.for("uk").format(msg("event.chest", { loot }))).toBe("Скриня: 5 золота, зілля.");
  });

  test("leaves unknown placeholders visible", () => {
    expect(Translator.for("en").t("event.welcome")).toBe("Welcome to Ruinwood, {name}!");
  });
});
