import type { MessageKey } from "../i18n/Message";

export const Tile = {
  Deep: 0,
  Shallow: 1,
  Sand: 2,
  Grass: 3,
  Flowers: 4,
  ForestFloor: 5,
  Tree: 6,
  Hills: 7,
  Rock: 8,
  Snow: 9,
  Wall: 10,
  Floor: 11,
  Campfire: 12,
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];

export interface TileInfo {
  readonly glyph: string;
  /** ANSI 256-color palette indices. */
  readonly fg: number;
  readonly bg: number;
  readonly walkable: boolean;
  /** Walkable, but slows players down and blocks mobs. */
  readonly slow: boolean;
  readonly zone: MessageKey;
}

const tile = (glyph: string, fg: number, bg: number, walkable: boolean, zone: MessageKey, slow = false): TileInfo => ({
  glyph,
  fg,
  bg,
  walkable,
  slow,
  zone,
});

/** Indexed by `TileId`; an array keeps the hot render loop free of hashing. */
export const TILES: readonly TileInfo[] = [
  /* Deep        */ tile("≈", 25, 17, false, "zone.sea"),
  /* Shallow     */ tile("~", 117, 24, true, "zone.shallows", true),
  /* Sand        */ tile(".", 223, 137, true, "zone.beach"),
  /* Grass       */ tile(",", 70, 22, true, "zone.meadow"),
  /* Flowers     */ tile("*", 211, 22, true, "zone.meadow"),
  /* ForestFloor */ tile("'", 29, 22, true, "zone.forest"),
  /* Tree        */ tile("♣", 34, 22, false, "zone.forest"),
  /* Hills       */ tile("n", 144, 58, true, "zone.hills"),
  /* Rock        */ tile("▲", 248, 238, false, "zone.cliffs"),
  /* Snow        */ tile("▲", 231, 250, false, "zone.peaks"),
  /* Wall        */ tile("#", 250, 240, false, "zone.ruins"),
  /* Floor       */ tile(".", 242, 236, true, "zone.ruins"),
  /* Campfire    */ tile("¤", 208, 52, false, "zone.camp"),
];
