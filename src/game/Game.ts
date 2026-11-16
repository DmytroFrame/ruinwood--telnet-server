import { Directions, type Direction } from "../core/Direction";
import { chance, randInt } from "../core/random";
import { msg, type Message } from "../i18n/Message";
import type { PlayerStore } from "../storage/PlayerStore";
import type { World } from "../world/World";
import { GroundItems, type ItemKind } from "./GroundItems";
import type { Mob } from "./Mob";
import { MobManager } from "./MobManager";
import { DEFAULT_LOG_COLOR, Player, Slot } from "./Player";
import { normalizeSettings, type PlayerSettings } from "./PlayerSettings";
import { Rules, xpToNext } from "./rules";

export interface Explosion {
  readonly x: number;
  readonly y: number;
  readonly until: number;
}

/** Log colors for game events. */
const Tone = {
  info: 244,
  welcome: 229,
  gold: 220,
  potion: 213,
  bomb: 208,
  scroll: 81,
  levelUp: 226,
  kill: 114,
  death: 196,
  deathOther: 160,
  heart: 205,
} as const;

/** Mob loot: the first roll that succeeds wins, so later entries are rarer than they look. */
const MOB_DROPS: readonly { kind: ItemKind; chance: number }[] = [
  { kind: "gold", chance: 0.45 },
  { kind: "heart", chance: 0.25 },
  { kind: "potion", chance: 0.1 },
  { kind: "bomb", chance: 0.08 },
  { kind: "scroll", chance: 0.03 },
];

/** Housekeeping that does not need to run every tick. */
const MAINTENANCE_EVERY = 10;

/** The shared simulation: players, mobs, items, combat and the tick loop. */
export class Game {
  tick = 0;
  readonly mobs: MobManager;
  readonly items = new GroundItems();
  private readonly roster = new Map<string, Player>();
  private activeExplosions: Explosion[] = [];
  private colorIndex = 0;

  constructor(
    readonly world: World,
    private readonly store: PlayerStore,
    /** Real time per tick; the simulation itself only counts ticks. */
    readonly tickMs = 100,
  ) {
    this.mobs = new MobManager(world, {
      onAttack: (mob, player) => this.hurtPlayer(player, Math.max(1, mob.damage + randInt(-1, 1)), mob),
      onRemove: (mob) => this.forgetMob(mob),
    });
  }

  get players(): IterableIterator<Player> {
    return this.roster.values();
  }

  get playerCount(): number {
    return this.roster.size;
  }

  get explosions(): readonly Explosion[] {
    return this.activeExplosions;
  }

  // ───────────────────────── Roster ─────────────────────────

  isOnline(name: string): boolean {
    return this.roster.has(name.toLowerCase());
  }

  /** Loads (or creates) a character and puts it next to the campfire. */
  join(name: string, fallbackSettings: PlayerSettings): Player {
    const saved = this.store.get(name);
    const color = Rules.playerColors[this.colorIndex++ % Rules.playerColors.length]!;
    const settings = normalizeSettings(saved?.settings, fallbackSettings);
    const spawn = { x: this.world.spawnX, y: this.world.spawnY };
    const player = new Player(saved?.name ?? name, color, settings, spawn, saved);

    this.roster.set(player.name.toLowerCase(), player);
    player.notify(
      saved ? msg("event.welcomeBack", { name: player.name, level: player.level }) : msg("event.welcome", { name: player.name }),
      Tone.welcome,
    );
    player.notify(msg("event.tips"), Tone.info);
    this.broadcast(msg("event.joined", { name: player.name }), Tone.info, player);
    return player;
  }

  leave(player: Player): void {
    this.store.put(player.toSave());
    this.roster.delete(player.name.toLowerCase());
    this.mobs.forgetTarget(player);
    this.broadcast(msg("event.left", { name: player.name }), Tone.info);
  }

  async saveAll(): Promise<void> {
    for (const p of this.roster.values()) this.store.put(p.toSave());
    await this.store.flush();
  }

  // ───────────────────────── Messaging ─────────────────────────

  broadcast(message: Message, color = DEFAULT_LOG_COLOR, except?: Player): void {
    for (const p of this.roster.values()) if (p !== except) p.notify(message, color);
  }

  chat(player: Player, text: string): void {
    this.broadcast(msg("event.chat", { name: player.name, text }), player.color);
    const lower = text.toLowerCase();
    for (const [name, other] of this.roster) if (other !== player && lower.includes(name)) other.alerts++;
  }

  /** Tells `player` who is online. */
  listPlayers(player: Player): void {
    const list = [...this.roster.values()].map((p) => `${p.name}(${p.level})`).join(", ");
    player.notify(msg("event.online", { list }), 117);
  }

  // ───────────────────────── Player actions ─────────────────────────

  move(player: Player, dir: Direction): void {
    if (player.dead) return;
    player.facing = dir;
    // Moves pressed during the cooldown are buffered so fast typing still feels responsive.
    if (this.tick < player.nextMove) player.pendingMove = dir;
    else this.step(player, dir);
  }

  attack(player: Player): void {
    if (player.dead || this.tick < player.nextAttack) return;
    player.nextAttack = this.tick + 4;
    player.slashUntil = this.tick + 2;
    player.markSlotUsed(Slot.Sword, this.tick);

    const tx = player.x + player.facing.dx;
    const ty = player.y + player.facing.dy;
    const mob = this.mobs.at(tx, ty);
    if (mob) {
      mob.takeHit(player.attack + randInt(0, player.level), this.tick);
      mob.provoke(player, this.tick);
      if (mob.isDead) this.killMob(mob, player);
      return;
    }
    this.tryOpenChest(player, tx, ty);
  }

  drinkPotion(player: Player): void {
    if (player.dead) return;
    if (player.inventory.count("potion") <= 0) return player.notify(msg("event.potionNone"), Tone.info);
    if (!player.isHurt) return player.notify(msg("event.potionFullHp"), Tone.info);
    player.inventory.take("potion");
    player.heal(Rules.potionHeal);
    player.markSlotUsed(Slot.Potion, this.tick);
    player.notify(msg("event.potionDrink", { hp: Rules.potionHeal }), Tone.potion);
  }

  /** The bomb flies up to two cells forward and hits every mob in a 5x5 square. */
  throwBomb(player: Player): void {
    if (player.dead) return;
    if (!player.inventory.take("bomb")) return player.notify(msg("event.bombNone"), Tone.info);

    let cx = player.x;
    let cy = player.y;
    for (let i = 0; i < Rules.bombThrowDistance; i++) {
      const nx = cx + player.facing.dx;
      const ny = cy + player.facing.dy;
      if (!this.world.info(nx, ny).walkable) break;
      cx = nx;
      cy = ny;
    }
    player.markSlotUsed(Slot.Bomb, this.tick);
    this.activeExplosions.push({ x: cx, y: cy, until: this.tick + 4 });

    const damage = 8 + player.level * 2;
    const victims = this.mobs.inSquare(cx, cy, Rules.bombRadius);
    for (const mob of victims) {
      mob.takeHit(damage, this.tick, 3);
      mob.provoke(player, this.tick);
      if (mob.isDead) this.killMob(mob, player);
    }
    player.notify(victims.length ? msg("event.bombHit", { count: victims.length }) : msg("event.bombMiss"), Tone.bomb);
  }

  /** The recall scroll teleports the player to the campfire instantly. */
  readScroll(player: Player): void {
    if (player.dead) return;
    if (!player.inventory.take("scroll")) return player.notify(msg("event.scrollNone"), Tone.info);
    player.markSlotUsed(Slot.Scroll, this.tick);
    player.teleport(this.world.spawnX, this.world.spawnY);
    player.target = null;
    player.notify(msg("event.scrollUse"), Tone.scroll);
  }

  // ───────────────────────── Tick ─────────────────────────

  update(): void {
    const tick = ++this.tick;
    const alive: Player[] = [];

    for (const p of this.roster.values()) {
      if (p.dead) {
        if (tick >= p.respawnAt) this.respawn(p);
        continue;
      }
      alive.push(p);
      if (p.pendingMove && tick >= p.nextMove) {
        const dir = p.pendingMove;
        p.pendingMove = null;
        this.step(p, dir);
      }
      this.regenerate(p, tick);
    }

    this.mobs.update(tick, alive);

    if (this.activeExplosions.length) this.activeExplosions = this.activeExplosions.filter((e) => tick < e.until);
    if (tick % MAINTENANCE_EVERY === 0) {
      this.items.expire(tick);
      for (const chest of this.world.chests.values()) chest.refill(tick, Rules.chestRefillTicks);
    }
  }

  // ───────────────────────── Internals ─────────────────────────

  private step(player: Player, dir: Direction): void {
    const nx = player.x + dir.dx;
    const ny = player.y + dir.dy;
    player.facing = dir;
    player.nextMove = this.tick + 1;

    if (this.mobs.at(nx, ny)) return this.attack(player);
    if (this.world.chests.has(this.world.key(nx, ny))) return this.tryOpenChest(player, nx, ny);

    const info = this.world.info(nx, ny);
    if (!info.walkable) return;
    player.x = nx;
    player.y = ny;
    if (info.slow) player.nextMove = this.tick + 3;
    this.pickUp(player);
  }

  /** Slow regeneration out of combat, fast regeneration by the campfire. */
  private regenerate(player: Player, tick: number): void {
    if (!player.isHurt) return;
    const nearFire = this.world.isNearCamp(player.x, player.y, Rules.campfireHealRadius);
    if ((nearFire && tick % 5 === 0) || (tick - player.lastHurt > 80 && tick % 30 === 0)) player.heal(1);
  }

  private tryOpenChest(player: Player, x: number, y: number): void {
    const chest = this.world.chests.get(this.world.key(x, y));
    if (!chest || chest.isOpen) return;
    chest.open(this.tick);

    const inv = player.inventory;
    const gold = randInt(10, 25) * this.world.danger(x, y);
    player.gold += gold;
    const loot: Message[] = [msg("loot.gold", { amount: gold })];

    if (chance(0.6) && inv.add("potion")) loot.push(msg("loot.potion"));
    if (chance(0.35) && !inv.isFull("bomb")) loot.push(msg("loot.bombs", { count: inv.add("bomb", randInt(1, 2)) }));
    if (chance(0.15) && inv.add("scroll")) loot.push(msg("loot.scroll"));
    if (chance(0.2)) {
      player.maxHp += Rules.hpPerHeart;
      player.hp = player.maxHp;
      loot.push(msg("loot.heartContainer"));
      this.broadcast(msg("event.heartFound", { name: player.name }), Tone.heart, player);
    }
    player.notify(msg("event.chest", { loot }), Tone.gold);
    player.alerts++;
  }

  private pickUp(player: Player): void {
    const key = this.world.key(player.x, player.y);
    const item = this.items.at(key);
    if (!item) return;

    switch (item.kind) {
      case "gold":
        player.gold += item.amount;
        player.notify(msg("event.pickupGold", { amount: item.amount }), Tone.gold);
        break;
      case "heart":
        if (!player.isHurt) return; // leave the heart for someone who needs it
        player.heal(item.amount);
        break;
      case "potion":
        if (!player.inventory.add("potion")) return;
        player.notify(msg("event.pickupPotion"), Tone.potion);
        break;
      case "bomb":
        if (!player.inventory.add("bomb")) return;
        player.notify(msg("event.pickupBomb"), Tone.bomb);
        break;
      case "scroll":
        if (!player.inventory.add("scroll")) return;
        player.notify(msg("event.pickupScroll"), Tone.scroll);
        break;
    }
    this.items.remove(key);
  }

  private gainXp(player: Player, xp: number): void {
    player.xp += xp;
    while (player.xp >= xpToNext(player.level)) {
      player.xp -= xpToNext(player.level);
      player.level++;
      player.maxHp += 2;
      player.attack += 1;
      player.hp = player.maxHp;
      player.alerts++;
      player.notify(msg("event.levelUp", { level: player.level }), Tone.levelUp);
      this.broadcast(msg("event.levelUpOther", { name: player.name, level: player.level }), Tone.levelUp, player);
    }
  }

  private hurtPlayer(player: Player, damage: number, by: Mob): void {
    player.hp -= damage;
    player.lastHurt = this.tick;
    player.hurtUntil = this.tick + 2;
    if (!player.target || this.tick >= player.targetUntil) {
      player.target = by;
      player.targetUntil = this.tick + 60;
    }
    if (player.hp > 0) {
      if (player.isLowHp) player.alerts++;
      return;
    }
    this.killPlayer(player, by);
  }

  /** Death costs a quarter of the gold, which stays on the ground for anyone to grab. */
  private killPlayer(player: Player, by: Mob): void {
    player.hp = 0;
    player.dead = true;
    player.respawnAt = this.tick + Rules.respawnTicks;
    player.pendingMove = null;
    player.target = null;
    player.alerts++;

    const lost = Math.floor(player.gold / 4);
    if (lost > 0) {
      player.gold -= lost;
      this.dropItem(player.x, player.y, "gold", lost, Rules.itemTtlTicks * 2);
    }
    const mobName = msg(by.kind.name);
    player.notify(msg("event.death", { mob: mobName, gold: lost }), Tone.death);
    this.broadcast(msg("event.deathOther", { name: player.name, mob: mobName }), Tone.deathOther, player);
    this.mobs.forgetTarget(player);
  }

  private respawn(player: Player): void {
    player.dead = false;
    player.hp = player.maxHp;
    player.facing = Directions.down;
    player.teleport(this.world.spawnX, this.world.spawnY);
    player.notify(msg("event.respawn"), Tone.welcome);
  }

  private killMob(mob: Mob, killer: Player): void {
    this.mobs.remove(mob);
    killer.kills++;
    killer.notify(msg("event.kill", { mob: msg(mob.kind.name), level: mob.level, xp: mob.xp }), Tone.kill);
    this.gainXp(killer, mob.xp);

    const drop = MOB_DROPS.find((d) => chance(d.chance));
    if (!drop) return;
    const amount =
      drop.kind === "gold" ? randInt(mob.kind.gold[0], mob.kind.gold[1]) * mob.level : drop.kind === "heart" ? Rules.hpPerHeart : 1;
    if (amount > 0) this.dropItem(mob.x, mob.y, drop.kind, amount, Rules.itemTtlTicks);
  }

  private dropItem(x: number, y: number, kind: ItemKind, amount: number, ttl: number): void {
    this.items.drop(this.world.key(x, y), { kind, amount, expiresAt: this.tick + ttl });
  }

  private forgetMob(mob: Mob): void {
    for (const p of this.roster.values()) if (p.target === mob) p.target = null;
  }
}
