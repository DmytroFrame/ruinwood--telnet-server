/** Balance constants. Durations are in ticks (1 tick = `CONFIG.tickMs`, 100 ms by default). */
export const Rules = {
  respawnTicks: 30,
  chestRefillTicks: 3000,
  itemTtlTicks: 600,
  /** Mobs never enter or target players inside this radius around the campfire. */
  safeRadius: 5,
  campfireHealRadius: 4,
  maxStack: 9,
  potionHeal: 10,
  hpPerHeart: 4,
  lowHpRatio: 0.35,
  logSize: 50,

  bombThrowDistance: 2,
  bombRadius: 2,

  /** Mobs further than this from every player stop thinking and slowly despawn. */
  mobActiveRangeX: 40,
  mobActiveRangeY: 30,
  mobChaseRange: 20,
  mobLeashRange: 8,
  maxMobs: 320,
  mobsPerPlayer: 35,
  baseMobCap: 40,

  startingStats: { hp: 12, attack: 3, potions: 1, bombs: 1, scrolls: 1 },
  playerColors: [45, 213, 220, 129, 39, 203, 87, 228, 141, 216] as readonly number[],
} as const;

/** XP needed to go from `level` to the next one. */
export function xpToNext(level: number): number {
  return Math.floor(12 * level ** 1.6);
}
