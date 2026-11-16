import { manhattan } from "../core/Direction";
import { randInt } from "../core/random";
import type { MobKind } from "./mobKinds";
import type { Player } from "./Player";

/** A monster instance. Stats scale with the danger level of the zone it spawned in. */
export class Mob {
  readonly maxHp: number;
  readonly damage: number;
  readonly xp: number;
  readonly homeX: number;
  readonly homeY: number;
  hp: number;
  nextMove: number;
  nextAttack = 0;
  hurtUntil = 0;
  /** The player who hit this mob; it keeps chasing them beyond its aggro radius. */
  target: Player | null = null;
  angryUntil = 0;

  constructor(
    readonly kind: MobKind,
    readonly level: number,
    public x: number,
    public y: number,
    tick: number,
  ) {
    const scale = level - 1;
    this.maxHp = Math.round(kind.hp * (1 + 0.4 * scale));
    this.hp = this.maxHp;
    this.damage = Math.round(kind.damage * (1 + 0.3 * scale));
    this.xp = Math.round(kind.xp * (1 + 0.5 * scale));
    this.homeX = x;
    this.homeY = y;
    this.nextMove = tick + randInt(0, kind.moveEvery);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  distanceTo(x: number, y: number): number {
    return manhattan(this.x, this.y, x, y);
  }

  /** Makes the mob chase `player`, and shows the mob in the player's HUD. */
  provoke(player: Player, tick: number): void {
    this.target = player;
    this.angryUntil = tick + 100;
    player.target = this;
    player.targetUntil = tick + 60;
  }

  takeHit(damage: number, tick: number, flashTicks = 2): void {
    this.hp -= damage;
    this.hurtUntil = tick + flashTicks;
  }
}
