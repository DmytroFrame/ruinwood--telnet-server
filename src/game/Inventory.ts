import { Rules } from "./rules";

export const CONSUMABLES = ["potion", "bomb", "scroll"] as const;
export type Consumable = (typeof CONSUMABLES)[number];

/** Stackable consumables, each capped at `Rules.maxStack`. */
export class Inventory {
  private readonly counts: Record<Consumable, number>;

  constructor(initial: Record<Consumable, number>) {
    this.counts = { ...initial };
  }

  count(kind: Consumable): number {
    return this.counts[kind];
  }

  isFull(kind: Consumable): boolean {
    return this.counts[kind] >= Rules.maxStack;
  }

  /** Adds up to `amount` items and returns how many actually fit. */
  add(kind: Consumable, amount = 1): number {
    const added = Math.max(0, Math.min(amount, Rules.maxStack - this.counts[kind]));
    this.counts[kind] += added;
    return added;
  }

  /** Removes one item; returns false if there was none. */
  take(kind: Consumable): boolean {
    if (this.counts[kind] <= 0) return false;
    this.counts[kind]--;
    return true;
  }
}
