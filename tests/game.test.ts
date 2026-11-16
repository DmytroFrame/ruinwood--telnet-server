import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Game } from "../src/game/Game";
import { Inventory } from "../src/game/Inventory";
import { defaultSettings, normalizeSettings } from "../src/game/PlayerSettings";
import { Rules } from "../src/game/rules";
import { PlayerStore } from "../src/storage/PlayerStore";
import { World } from "../src/world/World";

const world = new World(12345, 320, 180);
const newGame = () => new Game(world, new PlayerStore(join(tmpdir(), `ruinwood-test-${crypto.randomUUID()}.json`)));

describe("World", () => {
  test("is deterministic for a seed", () => {
    expect(new World(12345, 320, 180).tiles).toEqual(world.tiles);
  });

  test("spawn is reachable, walkable and in the safest zone", () => {
    expect(world.reachable[world.key(world.spawnX, world.spawnY)]).toBe(1);
    expect(world.info(world.spawnX, world.spawnY).walkable).toBe(true);
    expect(world.danger(world.spawnX, world.spawnY)).toBe(1);
  });

  test("places chests in ruins", () => {
    expect(world.chests.size).toBeGreaterThan(0);
  });
});

describe("Inventory", () => {
  test("caps stacks", () => {
    const inv = new Inventory({ potion: Rules.maxStack - 1, bomb: 0, scroll: 0 });
    expect(inv.add("potion", 5)).toBe(1);
    expect(inv.isFull("potion")).toBe(true);
    expect(inv.take("bomb")).toBe(false);
  });
});

describe("PlayerSettings", () => {
  test("drops invalid values from old or edited saves", () => {
    const fallback = defaultSettings("en");
    const raw = { locale: "xx", sound: false, sidebar: "sideways" } as never;
    expect(normalizeSettings(raw, fallback)).toEqual({ ...fallback, sound: false });
  });
});

describe("Game", () => {
  test("join, drink a potion and leave", () => {
    const game = newGame();
    const player = game.join("Tester", defaultSettings("uk"));
    expect(game.isOnline("tester")).toBe(true);
    expect(player.settings.locale).toBe("uk");

    player.hp = 1;
    game.drinkPotion(player);
    expect(player.hp).toBe(1 + Rules.potionHeal);
    expect(player.inventory.count("potion")).toBe(Rules.startingStats.potions - 1);

    game.leave(player);
    expect(game.isOnline("Tester")).toBe(false);
  });

  test("runs many ticks with a player online without errors", () => {
    const game = newGame();
    game.join("Runner", defaultSettings("en"));
    for (let i = 0; i < 500; i++) game.update();
    expect(game.mobs.count).toBeGreaterThan(0);
  });
});
