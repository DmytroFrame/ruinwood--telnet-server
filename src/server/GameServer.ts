import type { TCPSocketListener } from "bun";
import type { ServerConfig } from "../config";
import type { Game } from "../game/Game";
import { Session } from "../ui/Session";

/** Accepts telnet connections and drives the fixed-rate game loop. */
export class GameServer {
  private readonly sessions = new Set<Session>();
  private listener: TCPSocketListener<Session> | null = null;
  private timer: Timer | null = null;
  private stopping = false;

  constructor(
    private readonly game: Game,
    private readonly config: ServerConfig,
  ) {}

  get port(): number | undefined {
    return this.listener?.port;
  }

  start(): void {
    this.listener = Bun.listen<Session>({
      hostname: this.config.host,
      port: this.config.port,
      socket: {
        open: (socket) => {
          const session = new Session(socket, this.game, this.config.defaultLocale);
          socket.data = session;
          if (this.sessions.size >= this.config.maxPlayers) return session.quit("server.full");
          this.sessions.add(session);
          session.start();
        },
        data: (socket, data) => socket.data.onData(data),
        drain: (socket) => socket.data.onDrain(),
        close: (socket) => {
          socket.data.onClose();
          this.sessions.delete(socket.data);
        },
        error: (_socket, error) => console.error("Socket error:", error),
      },
    });
    this.timer = setInterval(() => this.tick(), this.config.tickMs);
  }

  /** Saves everyone, says goodbye to connected clients and closes the listener. */
  async stop(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    for (const session of this.sessions) session.quit("server.shutdown");
    await this.game.saveAll();
    this.listener?.stop(true);
  }

  private tick(): void {
    this.game.update();
    for (const session of this.sessions) session.render();
    if (this.game.tick % this.config.autosaveTicks === 0) {
      this.game.saveAll().catch((error) => console.error("Autosave failed:", error));
    }
  }
}
