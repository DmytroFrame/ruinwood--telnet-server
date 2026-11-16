import { Directions, type Direction } from "../core/Direction";
import type { Message } from "../i18n/Message";
import type { SavedPlayer } from "../storage/PlayerStore";
import { EventLog } from "./EventLog";
import { Inventory } from "./Inventory";
import type { Mob } from "./Mob";
import type { PlayerSettings } from "./PlayerSettings";
import { Rules } from "./rules";

/** Hotbar slot indices, also used to highlight the slot that was just used. */
export const Slot = { Sword: 0, Potion: 1, Bomb: 2, Scroll: 3 } as const;

export const DEFAULT_LOG_COLOR = 250;

export class Player {
  readonly log = new EventLog(Rules.logSize);
  readonly inventory: Inventory;

  x: number;
  y: number;
  facing: Direction = Directions.down;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
  xp: number;
  gold: number;
  kills: number;

  /** The mob the player is fighting, shown in the HUD. */
  target: Mob | null = null;
  targetUntil = 0;
  /** Counter of events worth a sound; the session rings when it changes. */
  alerts = 0;

  usedSlot = -1;
  usedUntil = 0;
  nextMove = 0;
  nextAttack = 0;
  pendingMove: Direction | null = null;
  lastHurt = -1000;
  hurtUntil = 0;
  slashUntil = 0;
  dead = false;
  respawnAt = 0;

  constructor(
    readonly name: string,
    readonly color: number,
    readonly settings: PlayerSettings,
    spawn: { x: number; y: number },
    saved?: SavedPlayer,
  ) {
    const start = Rules.startingStats;
    this.x = spawn.x;
    this.y = spawn.y;
    this.maxHp = saved?.maxHp ?? start.hp;
    this.hp = this.maxHp;
    this.attack = saved?.atk ?? start.attack;
    this.level = saved?.level ?? 1;
    this.xp = saved?.xp ?? 0;
    this.gold = saved?.gold ?? 0;
    this.kills = saved?.kills ?? 0;
    this.inventory = new Inventory({
      potion: saved?.potions ?? start.potions,
      bomb: saved?.bombs ?? start.bombs,
      scroll: saved?.scrolls ?? start.scrolls,
    });
  }

  get isLowHp(): boolean {
    return this.hp <= this.maxHp * Rules.lowHpRatio;
  }

  get isHurt(): boolean {
    return this.hp < this.maxHp;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.pendingMove = null;
  }

  /** Adds an entry to this player's event log. */
  notify(message: Message, color = DEFAULT_LOG_COLOR): void {
    this.log.push({ message, color });
  }

  markSlotUsed(slot: number, tick: number): void {
    this.usedSlot = slot;
    this.usedUntil = tick + 3;
  }

  toSave(): SavedPlayer {
    return {
      name: this.name,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      potions: this.inventory.count("potion"),
      bombs: this.inventory.count("bomb"),
      scrolls: this.inventory.count("scroll"),
      maxHp: this.maxHp,
      atk: this.attack,
      kills: this.kills,
      settings: { ...this.settings },
    };
  }
}
