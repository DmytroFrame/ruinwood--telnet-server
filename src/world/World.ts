import { mulberry32, type Rng } from "../core/random";
import { fbm } from "./noise";
import { TILES, Tile, type TileId, type TileInfo } from "./tiles";

export class Chest {
  /** Tick when the chest was looted; -1 while it is full. */
  private openedAt = -1;

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  get isOpen(): boolean {
    return this.openedAt >= 0;
  }

  open(tick: number): void {
    this.openedAt = tick;
  }

  /** Refills the chest once enough time has passed. */
  refill(tick: number, delay: number): void {
    if (this.isOpen && tick - this.openedAt > delay) this.openedAt = -1;
  }
}

const NEIGHBOURS = [1, 0, -1, 0, 0, 1, 0, -1] as const;
const RUIN_GROUND = new Set<TileId>([Tile.Grass, Tile.Flowers, Tile.ForestFloor, Tile.Tree, Tile.Sand, Tile.Hills]);
const CAMP_BLOCKERS = new Set<TileId>([Tile.Tree, Tile.Rock, Tile.Snow, Tile.Deep]);

/**
 * A procedurally generated island: terrain from fractal noise, a safe camp near the centre
 * and ruined buildings with treasure chests scattered around.
 */
export class World {
  readonly tiles: Uint8Array;
  /** Cells reachable on foot from the camp; mobs spawn only here. */
  readonly reachable: Uint8Array;
  /** Danger level per cell, precomputed because mobs and the HUD query it constantly. */
  private readonly dangerMap: Uint8Array;
  readonly chests = new Map<number, Chest>();
  spawnX = 0;
  spawnY = 0;
  campX = 0;
  campY = 0;

  constructor(
    readonly seed: number,
    readonly width: number,
    readonly height: number,
  ) {
    const size = width * height;
    this.tiles = new Uint8Array(size);
    this.reachable = new Uint8Array(size);
    this.dangerMap = new Uint8Array(size);

    const rng = mulberry32(seed);
    this.generateTerrain(rng);
    this.placeCamp();
    this.placeRuins(rng);
    this.computeReachable();
    this.computeDanger();
  }

  key(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  tileAt(x: number, y: number): TileId {
    if (!this.inBounds(x, y)) return Tile.Deep;
    return this.tiles[this.key(x, y)] as TileId;
  }

  info(x: number, y: number): TileInfo {
    return TILES[this.tileAt(x, y)]!;
  }

  /** Danger level 1..10: the farther from camp, the stronger the mobs. */
  danger(x: number, y: number): number {
    return this.inBounds(x, y) ? this.dangerMap[this.key(x, y)]! : 10;
  }

  /** True if (x, y) lies within `radius` of the campfire (cheap squared-distance check). */
  isNearCamp(x: number, y: number, radius: number): boolean {
    const dx = x - this.campX;
    const dy = y - this.campY;
    return dx * dx + dy * dy <= radius * radius;
  }

  private set(x: number, y: number, t: TileId): void {
    if (this.inBounds(x, y)) this.tiles[this.key(x, y)] = t;
  }

  private generateTerrain(rng: Rng): void {
    const elevationSeed = this.seed | 0;
    const moistureSeed = (this.seed * 31 + 7) | 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nx = (x / this.width) * 2 - 1;
        const ny = (y / this.height) * 2 - 1;
        // Distance to the edge: a blend of circle and square keeps the island off the borders.
        const d = 0.5 * (Math.hypot(nx, ny) / Math.SQRT2) + 0.5 * Math.max(Math.abs(nx), Math.abs(ny));
        const e = fbm(x / 40, y / 40, elevationSeed, 5) + 0.15 - 0.6 * d * d;
        const m = fbm(x / 30, y / 30, moistureSeed, 3);
        this.tiles[this.key(x, y)] = this.biome(e, m, rng);
      }
    }
  }

  private biome(elevation: number, moisture: number, rng: Rng): TileId {
    if (elevation < 0.33) return Tile.Deep;
    if (elevation < 0.38) return Tile.Shallow;
    if (elevation < 0.42) return Tile.Sand;
    if (elevation < 0.64) {
      if (moisture > 0.54) return rng() < 0.42 ? Tile.Tree : Tile.ForestFloor;
      if (rng() < 0.015) return Tile.Tree;
      return rng() < 0.04 ? Tile.Flowers : Tile.Grass;
    }
    if (elevation < 0.71) return Tile.Hills;
    if (elevation < 0.78) return Tile.Rock;
    return Tile.Snow;
  }

  /** The camp is a safe zone with a campfire on the meadow closest to the map centre. */
  private placeCamp(): void {
    const [bx, by] = this.findMeadowNear(Math.floor(this.width / 2), Math.floor(this.height / 2));
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (CAMP_BLOCKERS.has(this.tileAt(bx + dx, by + dy))) this.set(bx + dx, by + dy, Tile.Grass);
      }
    }
    this.set(bx, by, Tile.Campfire);
    this.campX = bx;
    this.campY = by;
    this.spawnX = bx;
    this.spawnY = by + 1;
  }

  /** Searches outward in square rings for the nearest grass tile. */
  private findMeadowNear(cx: number, cy: number): [number, number] {
    const maxR = Math.max(this.width, this.height);
    for (let r = 0; r < maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        // Only the ring's border: full rows at the top and bottom, two cells otherwise.
        const step = Math.abs(dy) === r ? 1 : 2 * r || 1;
        for (let dx = -r; dx <= r; dx += step) {
          const t = this.tileAt(cx + dx, cy + dy);
          if (t === Tile.Grass || t === Tile.Flowers) return [cx + dx, cy + dy];
        }
      }
    }
    return [cx, cy];
  }

  /** Scatters ruined 7x5 buildings with a chest inside and two doorways. */
  private placeRuins(rng: Rng, maxRuins = 28): void {
    let placed = 0;
    for (let attempt = 0; attempt < 4000 && placed < maxRuins; attempt++) {
      const x0 = 2 + Math.floor(rng() * (this.width - 12));
      const y0 = 2 + Math.floor(rng() * (this.height - 10));
      if (this.isNearCamp(x0 + 4, y0 + 3, 25) || !this.canPlaceRuin(x0, y0)) continue;
      this.buildRuin(x0, y0, rng);
      placed++;
    }
  }

  private canPlaceRuin(x0: number, y0: number): boolean {
    for (let y = y0; y < y0 + 7; y++) {
      for (let x = x0; x < x0 + 9; x++) {
        if (!RUIN_GROUND.has(this.tileAt(x, y)) || this.chests.has(this.key(x, y))) return false;
      }
    }
    return true;
  }

  private buildRuin(x0: number, y0: number, rng: Rng): void {
    // Clear a ring of trees around the building so the doorways are reachable.
    for (let y = y0; y < y0 + 7; y++) {
      for (let x = x0; x < x0 + 9; x++) {
        if (this.tileAt(x, y) === Tile.Tree) this.set(x, y, Tile.ForestFloor);
      }
    }
    const left = x0 + 1;
    const top = y0 + 1;
    for (let y = top; y < top + 5; y++) {
      for (let x = left; x < left + 7; x++) {
        const edge = y === top || y === top + 4 || x === left || x === left + 6;
        const broken = edge && rng() < 0.15;
        this.set(x, y, edge && !broken ? Tile.Wall : Tile.Floor);
      }
    }
    const doors: [number, number][] = [
      [left + 3, top],
      [left + 3, top + 4],
      [left, top + 2],
      [left + 6, top + 2],
    ];
    for (let i = 0; i < 2; i++) {
      const [dx, dy] = doors.splice(Math.floor(rng() * doors.length), 1)[0]!;
      this.set(dx, dy, Tile.Floor);
    }
    const chest = new Chest(left + 3, top + 2);
    this.chests.set(this.key(chest.x, chest.y), chest);
  }

  /** Flood fill from the spawn point over walkable tiles. */
  private computeReachable(): void {
    const stack = new Int32Array(this.width * this.height);
    let top = 0;
    const start = this.key(this.spawnX, this.spawnY);
    stack[top++] = start;
    this.reachable[start] = 1;

    while (top > 0) {
      const k = stack[--top]!;
      const x = k % this.width;
      const y = (k - x) / this.width;
      for (let i = 0; i < NEIGHBOURS.length; i += 2) {
        const nx = x + NEIGHBOURS[i]!;
        const ny = y + NEIGHBOURS[i + 1]!;
        if (!this.inBounds(nx, ny)) continue;
        const nk = this.key(nx, ny);
        if (this.reachable[nk] || !TILES[this.tiles[nk]!]!.walkable) continue;
        this.reachable[nk] = 1;
        stack[top++] = nk;
      }
    }
  }

  private computeDanger(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const d = Math.hypot(x - this.campX, y - this.campY);
        this.dangerMap[this.key(x, y)] = Math.min(10, 1 + Math.floor(d / 28));
      }
    }
  }
}
