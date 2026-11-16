import { join } from "node:path";
import { loadConfig, TELNET_PORT } from "./config";
import { Game } from "./game/Game";
import { GameServer } from "./server/GameServer";
import { PlayerStore } from "./storage/PlayerStore";
import { resolveWorldSeed } from "./storage/worldSeed";
import { World } from "./world/World";

const config = loadConfig();
const seed = await resolveWorldSeed(config.dataDir, config.seed);

const store = new PlayerStore(join(config.dataDir, "players.json"));
await store.load();

const started = performance.now();
const world = new World(seed, config.worldWidth, config.worldHeight);
console.log(`World generated (seed ${seed}) in ${Math.round(performance.now() - started)} ms`);

const game = new Game(world, store, config.tickMs);
const server = new GameServer(game, config);
try {
  server.start();
} catch (error) {
  if ((error as { code?: string }).code !== "EACCES") throw error;
  console.error(
    `No permission to listen on port ${config.port}. Ports below 1024 need elevated privileges on Linux:\n` +
      `  sudo setcap 'cap_net_bind_service=+ep' "$(which bun)"   # once, or\n` +
      `  PORT=2323 bun start                                     # use an unprivileged port`,
  );
  process.exit(1);
}
const portArg = server.port === TELNET_PORT ? "" : ` ${server.port}`;
console.log(`Ruinwood is listening on ${config.host}:${server.port} — connect with: telnet localhost${portArg}`);

async function shutdown(): Promise<void> {
  console.log("\nSaving players and shutting down...");
  await server.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
