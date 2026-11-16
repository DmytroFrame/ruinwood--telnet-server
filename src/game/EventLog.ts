import type { Message } from "../i18n/Message";

export interface LogEntry {
  readonly message: Message;
  readonly color: number;
}

/** Bounded per-player event log. `revision` lets views cache their layout until it changes. */
export class EventLog {
  private readonly entries: LogEntry[] = [];
  private _revision = 0;

  constructor(private readonly capacity: number) {}

  get revision(): number {
    return this._revision;
  }

  push(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
    this._revision++;
  }

  /** The newest `count` entries, oldest first. */
  tail(count: number): readonly LogEntry[] {
    return count > 0 ? this.entries.slice(-count) : [];
  }
}
