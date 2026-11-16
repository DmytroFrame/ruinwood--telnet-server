# RUINWOOD

**A multiplayer roguelike RPG you play over plain `telnet`.** Built with [Bun](https://bun.sh) and TypeScript, with no runtime dependencies.

🇺🇦 [Українська версія](README.uk.md)

```
╦═╗╦ ╦╦╔╗╔╦ ╦╔═╗╔═╗╔╦╗
╠╦╝║ ║║║║║║║║║ ║║ ║ ║║
╩╚═╚═╝╩╝╚╝╚╩╝╚═╝╚═╝═╩╝
```

Every server generates a random island with sea, beaches, meadows, forests, hills, mountains and ruins full of treasure chests. Players connect with an ordinary telnet client, see each other on the map and fight monsters together. The farther you go from the camp, the stronger the monsters get.

## Features

- **Real-time multiplayer** in any terminal, at 10 ticks per second.
- **Procedural world** from seeded fractal noise. The same seed always gives the same island.
- **Combat and loot**: six kinds of monsters, a sword, bombs, potions, recall scrolls, chests and heart containers.
- **Two languages**: English and Ukrainian, chosen per player and switchable at any time.
- **Settings menu** for language, sound, name tags, side panel and camera, saved with your character.
- **Efficient rendering**: frames are diffed line by line and only changed rows are sent. Slow clients skip frames instead of building a backlog.
- **Both keyboard layouts**: WASD and the other controls also work on the Ukrainian layout.

## Quick start

```bash
bun install
bun start            # or `bun dev` to restart on code changes
```

Connect from another terminal (on macOS, install telnet with `brew install telnet`):

```bash
telnet localhost
```

> On Linux, ports below 1024 need privileges: run `sudo setcap 'cap_net_bind_service=+ep' "$(which bun)"` once, or use another port with `PORT=2323 bun start` (then connect with `telnet localhost 2323`).

Pick a name and play. Your name keeps your progress. On the title screen, **Tab** switches the language.

## Configuration

All settings are environment variables:

| Variable         | Default                 | Description                                          |
|------------------|-------------------------|------------------------------------------------------|
| `PORT`           | `23`                    | TCP port (standard telnet port)                      |
| `HOST`           | `0.0.0.0`               | Interface to bind                                    |
| `SEED`           | from `data/world.json`  | World seed (same seed → same world)                  |
| `DATA_DIR`       | `data`                  | Where the world seed and player saves are stored     |
| `MAX_PLAYERS`    | `32`                    | Maximum simultaneous connections                     |
| `DEFAULT_LOCALE` | `en`                    | Title-screen language and default for new players (`en` / `uk`) |

## Controls

| Key                 | Action                               |
|---------------------|--------------------------------------|
| WASD / arrows       | Move (walking into a mob attacks it) |
| Space / 1           | Sword strike in the facing direction |
| 2 / E               | Drink a potion                       |
| 3                   | Throw a bomb (5×5 blast)             |
| 4                   | Recall scroll: teleport to camp      |
| T                   | Chat (`/who`, `/quit`)               |
| O / Esc             | Settings                             |
| H                   | Help                                 |
| Ctrl+C              | Quit                                 |

### Settings

| Option      | Values                       |
|-------------|------------------------------|
| Language    | English, Українська          |
| Sound       | on / off (terminal bell)     |
| Name tags   | on / off                     |
| Side panel  | auto (≥100 cols) / always / never |
| Camera      | smooth (dead zone) / centered |

Navigate with ↑↓ or W/S, change a value with ←→ or Enter, close with Esc or O.

## Gameplay

- **Health is shown as hearts** (1 ♥ = 4 HP). You regenerate slowly out of combat and quickly near the campfire `¤`. The camp is a safe zone.
- **Monsters**: slime `s`, bat `v`, wolf `w`, goblin `g`, skeleton `S` and stone golem `G`. Each lives in its own biome, and its level depends on the distance from camp.
- **Loot**: gold `$`, hearts `♥`, potions `!`, bombs `●` and recall scrolls `§`. Chests `■` in ruins give gold and supplies, and sometimes a heart container (+1 ♥ forever). Chests refill after 5 minutes.
- **Death** costs 25% of your gold. It drops where you fell and anyone can pick it up. You respawn at camp after 3 seconds.
- **Progress** is saved by name in `data/players.json`: automatically every 30 s, on logout and on shutdown.

## Interface

- **Top panel**: hearts and HP, level with XP bar, gold, attack, zone and danger, coordinates, and your current target's health.
- **Hotbar** under the map: slots 1–4 with item counts. A slot lights up when you use it.
- **Name tags** above other players, with `!` when they are low on health.
- **Side panel** on wide terminals: online players with direction and distance, and the event log. On narrow terminals the log appears under the hotbar.

## Development

```bash
bun test             # unit tests
bun run typecheck    # strict TypeScript check
bun run check        # both
```

Project layout:

```
src/
  main.ts            entry point: config, world, game, server
  config.ts          environment configuration
  core/              directions, seeded RNG helpers
  world/             World (terrain, camp, ruins), tiles, noise
  game/              Game, Player, Mob, MobManager, Inventory, items, rules
  i18n/              Translator, Message, locales/en.ts, locales/uk.ts
  net/               TelnetParser, KeyParser, Connection (backpressure)
  ui/                Session, Screen, scenes (login, play), widgets
  server/            GameServer: TCP listener and tick loop
  storage/           PlayerStore (JSON saves), world seed
tests/               bun:test suites
docs/                architecture notes
```

See [docs/architecture.md](docs/architecture.md) for how the pieces fit together, and [CONTRIBUTING.md](CONTRIBUTING.md) to add features or a new language.

## Limitations

- There are no passwords. Anyone who types a name plays as that hero.
- `nc` also works, but without character-at-a-time input, so every command needs Enter.

## Credits

Created by Dmytro Kostyshyn together with [Claude Code](https://claude.com/claude-code) (Anthropic), which co-wrote the code and documentation.

## License

[MIT](LICENSE)
