import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { PlayerSettings } from "../game/PlayerSettings";

/** Persisted character. Optional fields were added later and may be missing in old saves. */
export interface SavedPlayer {
  name: string;
  level: number;
  xp: number;
  gold: number;
  potions: number;
  bombs?: number;
  scrolls?: number;
  maxHp: number;
  atk: number;
  kills: number;
  settings?: Partial<PlayerSettings>;
}

/** Player progress in a single JSON file, keyed by lower-cased name. Writes are batched. */
export class PlayerStore {
  private data: Record<string, SavedPlayer> = {};
  private dirty = false;

  constructor(private readonly file: string) {}

  async load(): Promise<void> {
    const file = Bun.file(this.file);
    if (await file.exists()) this.data = await file.json();
  }

  get(name: string): SavedPlayer | undefined {
    return this.data[name.toLowerCase()];
  }

  put(player: SavedPlayer): void {
    this.data[player.name.toLowerCase()] = player;
    this.dirty = true;
  }

  /** Writes to disk only if something changed since the last flush. */
  async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    await mkdir(dirname(this.file), { recursive: true });
    await Bun.write(this.file, JSON.stringify(this.data, null, 2));
  }
}
