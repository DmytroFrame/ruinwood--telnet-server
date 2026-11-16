# Architecture

🇺🇦 [Українська версія](uk/architecture.md)

Ruinwood is a single Bun process. One fixed-rate loop advances the shared simulation, and every connected client gets its own session, which renders that simulation into ANSI text.

```
            ┌────────────┐  tick (100 ms)  ┌──────────────────────────────┐
 telnet ───►│ GameServer │────────────────►│ Game                         │
 clients    │  (TCP)     │                 │  ├─ World (tiles, chests)    │
            └─────┬──────┘                 │  ├─ MobManager (index + AI)  │
                  │ one per socket         │  ├─ GroundItems              │
            ┌─────▼──────┐   reads state   │  └─ Player × N               │
            │  Session   │◄────────────────┤                              │
            │  ├ Connection (telnet I/O)   └──────────────┬───────────────┘
            │  ├ Scene: Login | Play                      │ save / load
            │  └ Screen → line diff → socket       ┌──────▼──────┐
            └────────────┘                         │ PlayerStore │
                                                   └─────────────┘
```

## Layers

| Layer      | Files                    | Responsibility |
|------------|--------------------------|----------------|
| `core`     | `Direction`, `random`    | Small pure helpers shared by everything else. |
| `world`    | `World`, `tiles`, `noise`| Island generation, tile lookups, precomputed danger and reachability maps. |
| `game`     | `Game`, `Player`, `Mob`, `MobManager`, `Inventory`, `GroundItems`, `rules` | The simulation. It knows nothing about sockets or terminals. |
| `i18n`     | `Translator`, `Message`, `locales/*` | Translations. |
| `net`      | `TelnetParser`, `KeyParser`, `Connection` | Telnet protocol, key decoding, buffered output. |
| `ui`       | `Session`, `Screen`, `scenes/*`, `widgets/*` | Per-client state machine and rendering. |
| `server`   | `GameServer`             | TCP listener, tick loop, autosave, graceful shutdown. |
| `storage`  | `PlayerStore`, `worldSeed` | JSON persistence. |

Dependencies point downwards: `ui` → `game` → `world` → `core`. The game layer never imports from `ui` or `net`.

## The tick

`GameServer` calls `Game.update()` every `tickMs` (100 ms), then `Session.render()` for each client:

1. Players: respawn timers, buffered moves, regeneration.
2. `MobManager.update()`: AI for mobs near a player, despawn for idle ones, spawning on a ring around players.
3. Explosions fade. Every 10 ticks, ground items expire and chests refill.

Every 300 ticks (30 s), changed players are written to disk. `PlayerStore` tracks a dirty flag, so idle servers do not write.

## Internationalisation

The game never stores finished strings. Events are `Message` objects, which hold a dictionary key and parameters:

```ts
player.notify(msg("event.kill", { mob: msg(mob.kind.name), level: 3, xp: 12 }));
```

Parameters can be nested messages or lists of messages, like the loot in a chest. Each session translates at render time with `Translator.for(player.settings.locale)`, so:

- two players in the same fight see the same event in their own languages;
- switching language in the settings menu re-translates the existing event log immediately.

`locales/en.ts` is the reference dictionary. Other locales are typed as `Dictionary`, so a missing key is a compile error, and a test checks that placeholders match.

## Rendering

- `Screen` is a reusable cell buffer holding a glyph, foreground, background and bold flag. It is reallocated only on resize.
- `Screen.line(y)` encodes a row as ANSI and emits color codes only where attributes change.
- `Session` keeps the previous frame's rows and sends only the rows that changed. While the camera stands still, a frame is often just a handful of rows.
- `MapView` draws terrain straight from the tile array, then overlays the entities: chests, items, mobs and players. This replaces probing four hash maps for each of the ~3000 visible cells.
- `LogView` caches translated and word-wrapped log lines until the log revision, locale or size changes.
- `Connection` keeps unsent output as a chunk list. While it is congested, `render()` skips frames, and a client more than 256 KB behind is disconnected.

## Mobs

`MobManager` keeps a `Map<cellKey, Mob>` index next to the set of mobs. As a result:

- collision checks and "which mob is here?" lookups are O(1);
- a bomb blast looks up the 25 cells of its area instead of scanning every mob.

Spawn candidates for each (tile, danger) pair are computed once and cached. The danger level and the camp distance checks use precomputed or squared-distance math instead of `Math.hypot` in hot paths.

## Sessions and scenes

A `Session` hosts one `Scene` at a time:

- `LoginScene`: name prompt and pre-login language switch (Tab).
- `PlayScene`: the game, with the modes `play`, `chat`, `help` and `settings`.

Key presses are mapped to `Action`s in `ui/input.ts`. The same physical keys work on Latin and Ukrainian layouts. Scenes talk to the session only through the small `SceneHost` interface.
