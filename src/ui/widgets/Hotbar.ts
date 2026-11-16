import { ITEM_LOOK } from "../../game/GroundItems";
import type { Consumable } from "../../game/Inventory";
import type { MessageKey } from "../../i18n/Message";
import type { Screen } from "../Screen";
import { Palette } from "../theme";
import type { FrameContext } from "./Widget";

interface SlotSpec {
  readonly icon: string;
  readonly name: MessageKey;
  readonly color: number;
  /** Consumable shown with a counter; the sword has none. */
  readonly item?: Consumable;
}

const SLOTS: readonly SlotSpec[] = [
  { icon: "†", name: "item.sword", color: Palette.bright },
  { icon: ITEM_LOOK.potion.glyph, name: "item.potion", color: ITEM_LOOK.potion.color, item: "potion" },
  { icon: ITEM_LOOK.bomb.glyph, name: "item.bomb", color: ITEM_LOOK.bomb.color, item: "bomb" },
  { icon: ITEM_LOOK.scroll.glyph, name: "item.scroll", color: ITEM_LOOK.scroll.color, item: "scroll" },
];

/** Below this width, slot names are hidden. */
const COMPACT_WIDTH = 64;

/** Items on keys 1–4; the slot just used is highlighted. */
export class Hotbar {
  draw(scr: Screen, { player: p, t, tick }: FrameContext, y: number, width: number): void {
    scr.fillRect(0, y, width, 1, Palette.hotbar);
    const compact = width < COMPACT_WIDTH;
    let x = 1;
    SLOTS.forEach((slot, i) => {
      const count = slot.item ? p.inventory.count(slot.item) : -1;
      const empty = count === 0;
      const ready = slot.item !== undefined || tick >= p.nextAttack;
      const bg = p.usedSlot === i && tick < p.usedUntil ? Palette.slotActive : Palette.slot;

      x = scr.text(x, y, ` ${i + 1} `, empty ? Palette.dim : Palette.key, Palette.slotKey, true);
      x = scr.text(x, y, ` ${slot.icon}`, empty || !ready ? Palette.frame : slot.color, bg, true);
      if (!compact) x = scr.text(x, y, ` ${t.t(slot.name)}`, empty ? Palette.frame : Palette.text, bg);
      x = scr.text(x, y, count >= 0 ? ` ×${count} ` : " ", empty ? Palette.frame : Palette.dim, bg);
      x += 1;
    });
  }
}
