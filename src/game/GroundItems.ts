import type { Consumable } from "./Inventory";

export type ItemKind = "gold" | "heart" | Consumable;

export interface GroundItem {
  readonly kind: ItemKind;
  amount: number;
  expiresAt: number;
}

export const ITEM_LOOK: Readonly<Record<ItemKind, { glyph: string; color: number }>> = {
  gold: { glyph: "$", color: 220 },
  heart: { glyph: "♥", color: 196 },
  potion: { glyph: "!", color: 213 },
  bomb: { glyph: "●", color: 208 },
  scroll: { glyph: "§", color: 81 },
};

/** Items lying on the ground, at most one per cell (gold piles merge). */
export class GroundItems implements Iterable<[number, GroundItem]> {
  private readonly items = new Map<number, GroundItem>();

  [Symbol.iterator](): Iterator<[number, GroundItem]> {
    return this.items.entries();
  }

  at(key: number): GroundItem | undefined {
    return this.items.get(key);
  }

  drop(key: number, item: GroundItem): void {
    const existing = this.items.get(key);
    if (!existing) {
      this.items.set(key, item);
    } else if (existing.kind === "gold" && item.kind === "gold") {
      existing.amount += item.amount;
      existing.expiresAt = Math.max(existing.expiresAt, item.expiresAt);
    }
  }

  remove(key: number): void {
    this.items.delete(key);
  }

  expire(tick: number): void {
    for (const [key, item] of this.items) if (tick >= item.expiresAt) this.items.delete(key);
  }
}
