import { CARDINALS, type Direction } from "../core/Direction";
import { chance, pick, randInt } from "../core/random";
import type { TileId } from "../world/tiles";
import type { World } from "../world/World";
import { Mob } from "./Mob";
import { MOB_KINDS, type MobKind } from "./mobKinds";
import type { Player } from "./Player";
import { Rules } from "./rules";

export interface MobEvents {
  onAttack(mob: Mob, player: Player): void;
  onRemove(mob: Mob): void;
}

interface SpawnTable {
  readonly kinds: readonly MobKind[];
  readonly totalWeight: number;
}

/** Owns every mob: spawning, a position index for O(1) lookups, and the chase/wander AI. */
export class MobManager implements Iterable<Mob> {
  private readonly mobs = new Set<Mob>();
  private readonly index = new Map<number, Mob>();
  /** Spawn candidates per (tile, danger) pair; there are only a few hundred combinations. */
  private readonly spawnTables = new Map<number, SpawnTable | null>();

  constructor(
    private readonly world: World,
    private readonly events: MobEvents,
  ) {}

  get count(): number {
    return this.mobs.size;
  }

  [Symbol.iterator](): Iterator<Mob> {
    return this.mobs.values();
  }

  at(x: number, y: number): Mob | undefined {
    return this.world.inBounds(x, y) ? this.index.get(this.world.key(x, y)) : undefined;
  }

  /** Mobs inside the square of half-size `radius` around (cx, cy), via the position index. */
  inSquare(cx: number, cy: number, radius: number): Mob[] {
    const found: Mob[] = [];
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const mob = this.at(x, y);
        if (mob) found.push(mob);
      }
    }
    return found;
  }

  remove(mob: Mob): void {
    if (!this.mobs.delete(mob)) return;
    this.index.delete(this.world.key(mob.x, mob.y));
    this.events.onRemove(mob);
  }

  /** Forgets `player` as a chase target, e.g. after death or logout. */
  forgetTarget(player: Player): void {
    for (const mob of this.mobs) if (mob.target === player) mob.target = null;
  }

  update(tick: number, alive: readonly Player[]): void {
    for (const mob of this.mobs) {
      if (this.isActive(mob, alive)) this.think(mob, tick, alive);
      else if (chance(0.01)) this.remove(mob);
    }

    const cap = Math.min(Rules.maxMobs, Rules.baseMobCap + alive.length * Rules.mobsPerPlayer);
    if (alive.length && this.mobs.size < cap) {
      for (let i = 0; i < 2; i++) {
        const anchor = pick(alive);
        this.trySpawnNear(anchor.x, anchor.y, tick, alive);
      }
    }
  }

  /** Only mobs near some player run AI; the rest idle and slowly despawn. */
  private isActive(mob: Mob, alive: readonly Player[]): boolean {
    for (const p of alive) {
      if (Math.abs(p.x - mob.x) < Rules.mobActiveRangeX && Math.abs(p.y - mob.y) < Rules.mobActiveRangeY) return true;
    }
    return false;
  }

  private think(mob: Mob, tick: number, alive: readonly Player[]): void {
    const target = this.findTarget(mob, tick, alive);
    if (target && mob.distanceTo(target.x, target.y) === 1) {
      if (tick >= mob.nextAttack) {
        mob.nextAttack = tick + mob.kind.attackEvery;
        this.events.onAttack(mob, target);
      }
      return;
    }
    if (tick < mob.nextMove) return;
    mob.nextMove = tick + mob.kind.moveEvery + randInt(0, 1);

    if (target && !chance(mob.kind.erratic)) {
      this.stepToward(mob, target.x, target.y, alive);
    } else if (Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY) > Rules.mobLeashRange) {
      this.stepToward(mob, mob.homeX, mob.homeY, alive);
    } else if (target || chance(0.35)) {
      this.step(mob, pick(CARDINALS), alive);
    }
  }

  private findTarget(mob: Mob, tick: number, alive: readonly Player[]): Player | null {
    const chased = mob.target;
    if (
      chased &&
      !chased.dead &&
      tick < mob.angryUntil &&
      !this.isSafe(chased.x, chased.y) &&
      mob.distanceTo(chased.x, chased.y) < Rules.mobChaseRange
    ) {
      return chased;
    }
    let best: Player | null = null;
    let bestDist = mob.kind.aggroRadius + 1;
    for (const p of alive) {
      const d = mob.distanceTo(p.x, p.y);
      if (d < bestDist && !this.isSafe(p.x, p.y)) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  private isSafe(x: number, y: number): boolean {
    return this.world.isNearCamp(x, y, Rules.safeRadius);
  }

  private canEnter(x: number, y: number, alive: readonly Player[]): boolean {
    const info = this.world.info(x, y);
    if (!info.walkable || info.slow || this.isSafe(x, y)) return false;
    const key = this.world.key(x, y);
    if (this.index.has(key) || this.world.chests.has(key)) return false;
    for (const p of alive) if (p.x === x && p.y === y) return false;
    return true;
  }

  private step(mob: Mob, dir: Direction, alive: readonly Player[]): boolean {
    const nx = mob.x + dir.dx;
    const ny = mob.y + dir.dy;
    if (!this.canEnter(nx, ny, alive)) return false;
    this.index.delete(this.world.key(mob.x, mob.y));
    mob.x = nx;
    mob.y = ny;
    this.index.set(this.world.key(nx, ny), mob);
    return true;
  }

  /** Greedy pursuit: try the longer axis first, then the other, then a random step. */
  private stepToward(mob: Mob, tx: number, ty: number, alive: readonly Player[]): void {
    const horizontal = { dx: Math.sign(tx - mob.x), dy: 0 };
    const vertical = { dx: 0, dy: Math.sign(ty - mob.y) };
    const order = Math.abs(tx - mob.x) >= Math.abs(ty - mob.y) ? [horizontal, vertical] : [vertical, horizontal];
    for (const dir of order) if ((dir.dx || dir.dy) && this.step(mob, dir, alive)) return;
    this.step(mob, pick(CARDINALS), alive);
  }

  /** Tries a few random points on a ring around (cx, cy), outside the player's view. */
  private trySpawnNear(cx: number, cy: number, tick: number, alive: readonly Player[]): void {
    const w = this.world;
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 22;
      const x = Math.round(cx + Math.cos(angle) * r);
      const y = Math.round(cy + Math.sin(angle) * r);
      if (!w.inBounds(x, y) || !w.reachable[w.key(x, y)]) continue;
      if (w.isNearCamp(x, y, Rules.safeRadius + 4) || !this.canEnter(x, y, alive)) continue;

      const level = w.danger(x, y);
      const kind = this.rollKind(w.tileAt(x, y), level);
      if (!kind) continue;

      const mob = new Mob(kind, level, x, y, tick);
      this.mobs.add(mob);
      this.index.set(w.key(x, y), mob);
      return;
    }
  }

  private rollKind(tile: TileId, danger: number): MobKind | null {
    const table = this.spawnTable(tile, danger);
    if (!table) return null;
    let roll = Math.random() * table.totalWeight;
    return table.kinds.find((k) => (roll -= k.weight) < 0) ?? table.kinds[0]!;
  }

  private spawnTable(tile: TileId, danger: number): SpawnTable | null {
    const key = tile * 16 + danger;
    let table = this.spawnTables.get(key);
    if (table === undefined) {
      const kinds = MOB_KINDS.filter((k) => k.habitat.includes(tile) && danger >= k.minDanger);
      table = kinds.length ? { kinds, totalWeight: kinds.reduce((sum, k) => sum + k.weight, 0) } : null;
      this.spawnTables.set(key, table);
    }
    return table;
  }
}
