import { join } from "node:path";

/**
 * Picks the world seed: an explicit one wins, otherwise the seed saved in `world.json`
 * is reused so the map survives restarts, and a fresh one is generated only on first run.
 */
export async function resolveWorldSeed(dataDir: string, explicit?: number): Promise<number> {
  const file = Bun.file(join(dataDir, "world.json"));
  let seed = explicit;
  if (seed === undefined && (await file.exists())) seed = (await file.json()).seed;
  seed ??= Math.floor(Math.random() * 2 ** 31);
  await Bun.write(file, JSON.stringify({ seed }));
  return seed;
}
