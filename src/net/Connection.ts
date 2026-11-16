import type { Socket } from "bun";
import { parseKeys, type Key } from "./KeyParser";
import { NEGOTIATION, TelnetParser, type WindowSize } from "./TelnetParser";

/** Drop clients that fall this far behind instead of buffering without limit. */
const MAX_PENDING_BYTES = 256 * 1024;

export interface InputEvent {
  readonly keys: readonly Key[];
  readonly size: WindowSize | null;
  readonly interrupt: boolean;
}

/**
 * One telnet client socket: protocol negotiation, input decoding and backpressure-aware output.
 * Unsent data is kept as a list of chunks and joined once when the socket drains.
 */
export class Connection<TData = unknown> {
  private readonly telnet = new TelnetParser();
  private readonly decoder = new TextDecoder();
  private pending: Uint8Array[] = [];
  private pendingBytes = 0;
  private closed = false;

  constructor(private readonly socket: Socket<TData>) {}

  get isClosed(): boolean {
    return this.closed;
  }

  /** True while earlier output is still waiting for the socket to drain. */
  get isCongested(): boolean {
    return this.pendingBytes > 0;
  }

  open(): void {
    this.write(NEGOTIATION);
  }

  decode(chunk: Uint8Array): InputEvent {
    const result = this.telnet.feed(chunk);
    if (result.replies) this.write(result.replies);
    const text = this.decoder.decode(result.data, { stream: true });
    return { keys: parseKeys(text), size: result.size, interrupt: result.interrupt };
  }

  write(data: string | Uint8Array): void {
    if (this.closed) return;
    const bytes = typeof data === "string" ? Buffer.from(data) : data;
    if (this.pendingBytes > 0) {
      this.enqueue(bytes);
      return;
    }
    const written = Math.max(0, this.socket.write(bytes));
    if (written < bytes.length) this.enqueue(bytes.subarray(written));
  }

  /** Called on the socket's `drain` event. */
  flush(): void {
    if (!this.pendingBytes || this.closed) return;
    const joined = this.pending.length === 1 ? this.pending[0]! : Buffer.concat(this.pending);
    const written = Math.max(0, this.socket.write(joined));
    const rest = joined.subarray(written);
    this.pending = rest.length ? [rest] : [];
    this.pendingBytes = rest.length;
  }

  /** Sends a final message and closes the socket. */
  end(text?: string): void {
    if (this.closed) return;
    if (text) this.write(text);
    this.closed = true;
    this.socket.end();
  }

  markClosed(): void {
    this.closed = true;
    this.pending = [];
    this.pendingBytes = 0;
  }

  private enqueue(bytes: Uint8Array): void {
    this.pending.push(bytes);
    this.pendingBytes += bytes.length;
    if (this.pendingBytes > MAX_PENDING_BYTES) this.end();
  }
}
