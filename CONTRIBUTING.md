# Contributing

Thanks for your interest in Ruinwood! Bug reports, ideas and pull requests are welcome.

## Setup

```bash
bun install
bun dev              # server restarts on every change
telnet localhost
```

Before opening a pull request:

```bash
bun run check        # strict typecheck + tests
```

## Code style

- TypeScript in strict mode. Unused locals and parameters are errors.
- All code, identifiers and comments are in English. User-facing text belongs in the dictionaries under `src/i18n/locales/`, never in code.
- Prefer small classes with one clear job. The `game` layer must not import from `ui`, `net` or `server`.
- Keep hot paths (the tick loop and rendering) allocation-light.
- Two-space indentation (see `.editorconfig`), double quotes, trailing commas.

## Adding a translatable string

1. Add the key to `src/i18n/locales/en.ts`.
2. Add the same key to every other locale. Missing keys fail the typecheck.
3. Use it with `t.t("your.key", { param })` in UI code, or `player.notify(msg("your.key", { param }))` for game events.

## Adding a language

1. Create `src/i18n/locales/<code>.ts` exporting a `Dictionary`.
2. Register it in `LOCALES` and `DICTIONARIES` in `src/i18n/Translator.ts`.
3. Optionally add keyboard-layout bindings in `src/ui/input.ts`.
4. Run `bun test`. It checks that placeholders match the English strings.

The new language then shows up in the settings menu and the title-screen Tab switch automatically.

## Adding a setting

1. Add the field to `PlayerSettings`, `defaultSettings` and `normalizeSettings` in `src/game/PlayerSettings.ts`.
2. Add a `SettingOption` row to `OPTIONS` in `src/ui/widgets/SettingsMenu.ts`.
3. Add the label and values to the dictionaries.
