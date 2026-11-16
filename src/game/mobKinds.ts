import type { MessageKey } from "../i18n/Message";
import { Tile, type TileId } from "../world/tiles";

export interface MobKind {
  readonly id: string;
  readonly name: MessageKey;
  readonly glyph: string;
  readonly color: number;
  readonly hp: number;
  readonly damage: number;
  readonly xp: number;
  /** Gold drop range per mob level. */
  readonly gold: readonly [number, number];
  /** Ticks between steps. */
  readonly moveEvery: number;
  readonly attackEvery: number;
  /** Radius within which the mob notices players. */
  readonly aggroRadius: number;
  /** Chance to take a random step instead of chasing. */
  readonly erratic: number;
  /** Minimum zone danger level where the mob spawns. */
  readonly minDanger: number;
  readonly weight: number;
  readonly habitat: readonly TileId[];
}

const { Grass, Flowers, Sand, ForestFloor, Hills, Floor } = Tile;

export const MOB_KINDS: readonly MobKind[] = [
  {
    id: "slime", name: "mob.slime", glyph: "s", color: 51, hp: 5, damage: 1, xp: 3, gold: [1, 3],
    moveEvery: 6, attackEvery: 10, aggroRadius: 5, erratic: 0.3, minDanger: 1, weight: 5,
    habitat: [Grass, Flowers, Sand, ForestFloor],
  },
  {
    id: "bat", name: "mob.bat", glyph: "v", color: 177, hp: 4, damage: 1, xp: 4, gold: [0, 2],
    moveEvery: 2, attackEvery: 8, aggroRadius: 6, erratic: 0.5, minDanger: 1, weight: 3,
    habitat: [Hills, Floor, ForestFloor],
  },
  {
    id: "wolf", name: "mob.wolf", glyph: "w", color: 250, hp: 9, damage: 2, xp: 7, gold: [0, 3],
    moveEvery: 3, attackEvery: 8, aggroRadius: 9, erratic: 0.05, minDanger: 1, weight: 3,
    habitat: [ForestFloor, Grass],
  },
  {
    id: "goblin", name: "mob.goblin", glyph: "g", color: 208, hp: 12, damage: 3, xp: 10, gold: [3, 8],
    moveEvery: 4, attackEvery: 10, aggroRadius: 7, erratic: 0.1, minDanger: 2, weight: 3,
    habitat: [Grass, Hills, ForestFloor, Sand],
  },
  {
    id: "skeleton", name: "mob.skeleton", glyph: "S", color: 255, hp: 16, damage: 3, xp: 14, gold: [4, 10],
    moveEvery: 4, attackEvery: 10, aggroRadius: 8, erratic: 0.05, minDanger: 2, weight: 2,
    habitat: [Floor, Sand, Hills],
  },
  {
    id: "golem", name: "mob.golem", glyph: "G", color: 180, hp: 40, damage: 6, xp: 40, gold: [15, 30],
    moveEvery: 7, attackEvery: 16, aggroRadius: 6, erratic: 0, minDanger: 3, weight: 1,
    habitat: [Hills],
  },
];
