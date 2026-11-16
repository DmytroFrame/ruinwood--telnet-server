// Minimal telnet (RFC 854) with NAWS window-size reporting (RFC 1073).

const IAC = 255;
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const IP = 244;
const BRK = 243;
const SE = 240;

const OPT_ECHO = 1;
const OPT_SGA = 3;
const OPT_NAWS = 31;

const MAX_SUBNEGOTIATION = 64;

/**
 * Sent on connect: the server echoes input itself (WILL ECHO) and disables line buffering
 * (SGA), so the client sends every key press immediately. It also asks for the window size.
 */
export const NEGOTIATION = new Uint8Array([
  IAC, WILL, OPT_ECHO,
  IAC, WILL, OPT_SGA,
  IAC, DO, OPT_SGA,
  IAC, DO, OPT_NAWS,
]);

export interface WindowSize {
  readonly cols: number;
  readonly rows: number;
}

export interface TelnetResult {
  /** Application data with all telnet commands stripped. */
  readonly data: Uint8Array;
  /** Bytes to send back (refusals for options we don't support). */
  readonly replies: Uint8Array | null;
  readonly size: WindowSize | null;
  /** The client sent Interrupt Process or Break (e.g. Ctrl+C in some clients). */
  readonly interrupt: boolean;
}

const enum State {
  Data,
  Command,
  Option,
  Sub,
  SubIac,
}

/** Incremental telnet stream parser: commands may be split across TCP packets. */
export class TelnetParser {
  private state = State.Data;
  private verb = 0;
  private readonly sub: number[] = [];

  feed(chunk: Uint8Array): TelnetResult {
    // Fast path: plain key presses carry no telnet commands at all.
    if (this.state === State.Data && !chunk.includes(IAC)) {
      return { data: chunk, replies: null, size: null, interrupt: false };
    }

    const data: number[] = [];
    const replies: number[] = [];
    let size: WindowSize | null = null;
    let interrupt = false;

    for (const b of chunk) {
      switch (this.state) {
        case State.Data:
          if (b === IAC) this.state = State.Command;
          else data.push(b);
          break;

        case State.Command:
          if (b === IAC) {
            data.push(IAC);
            this.state = State.Data;
          } else if (b >= WILL && b <= DONT) {
            this.verb = b;
            this.state = State.Option;
          } else if (b === SB) {
            this.sub.length = 0;
            this.state = State.Sub;
          } else {
            if (b === IP || b === BRK) interrupt = true;
            this.state = State.Data;
          }
          break;

        case State.Option:
          // Refuse every option we don't implement so the client doesn't wait for an answer.
          if (this.verb === DO && b !== OPT_ECHO && b !== OPT_SGA) replies.push(IAC, WONT, b);
          if (this.verb === WILL && b !== OPT_NAWS && b !== OPT_SGA) replies.push(IAC, DONT, b);
          this.state = State.Data;
          break;

        case State.Sub:
          if (b === IAC) this.state = State.SubIac;
          else if (this.sub.length < MAX_SUBNEGOTIATION) this.sub.push(b);
          break;

        case State.SubIac:
          if (b === SE) {
            size = this.parseNaws() ?? size;
            this.state = State.Data;
          } else if (b === IAC) {
            this.sub.push(IAC);
            this.state = State.Sub;
          } else {
            this.state = State.Data;
          }
          break;
      }
    }

    return {
      data: Uint8Array.from(data),
      replies: replies.length ? Uint8Array.from(replies) : null,
      size,
      interrupt,
    };
  }

  private parseNaws(): WindowSize | null {
    const s = this.sub;
    if (s[0] !== OPT_NAWS || s.length < 5) return null;
    return { cols: s[1]! * 256 + s[2]!, rows: s[3]! * 256 + s[4]! };
  }
}
