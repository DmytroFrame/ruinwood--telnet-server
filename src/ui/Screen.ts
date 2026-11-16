/** Default terminal color. */
export const NO_COLOR = -1;

/**
 * Frame buffer: a glyph, foreground, background and bold flag per cell (256-color ANSI).
 * One instance is reused across frames; it is only reallocated when the window is resized.
 */
export class Screen {
  private ch: string[] = [];
  private fg = new Int16Array(0);
  private bg = new Int16Array(0);
  private bold = new Uint8Array(0);
  private _w = 0;
  private _h = 0;

  constructor(w: number, h: number) {
    this.resize(w, h);
  }

  get w(): number {
    return this._w;
  }

  get h(): number {
    return this._h;
  }

  resize(w: number, h: number): void {
    if (w === this._w && h === this._h) return;
    const n = w * h;
    this._w = w;
    this._h = h;
    this.ch = new Array<string>(n);
    this.fg = new Int16Array(n);
    this.bg = new Int16Array(n);
    this.bold = new Uint8Array(n);
    this.clear();
  }

  clear(): void {
    this.ch.fill(" ");
    this.fg.fill(NO_COLOR);
    this.bg.fill(NO_COLOR);
    this.bold.fill(0);
  }

  put(x: number, y: number, ch: string, fg = NO_COLOR, bg = NO_COLOR, bold = false): void {
    if (x < 0 || y < 0 || x >= this._w || y >= this._h) return;
    const i = y * this._w + x;
    this.ch[i] = ch;
    this.fg[i] = fg;
    this.bg[i] = bg;
    this.bold[i] = bold ? 1 : 0;
  }

  /** Writes a string and returns the x right after its last character. */
  text(x: number, y: number, str: string, fg = NO_COLOR, bg = NO_COLOR, bold = false): number {
    for (const c of str) this.put(x++, y, c, fg, bg, bold);
    return x;
  }

  /** Writes a string centered horizontally within [x0, x0 + width). */
  centered(y: number, str: string, fg = NO_COLOR, bg = NO_COLOR, bold = false, x0 = 0, width = this._w): number {
    return this.text(x0 + Math.max(0, Math.floor((width - textWidth(str)) / 2)), y, str, fg, bg, bold);
  }

  fillRect(x0: number, y0: number, w: number, h: number, bg: number): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.put(x, y, " ", NO_COLOR, bg);
  }

  fillRow(y: number, bg: number): void {
    this.fillRect(0, y, this._w, 1, bg);
  }

  /** Encodes one row as ANSI; color codes are emitted only where attributes change. */
  line(y: number): string {
    let out = "\x1b[0m";
    let curFg = -2;
    let curBg = -2;
    let curBold = 0;
    const start = y * this._w;
    for (let i = start; i < start + this._w; i++) {
      const f = this.fg[i]!;
      const b = this.bg[i]!;
      const bo = this.bold[i]!;
      if (bo !== curBold) {
        // Bold can only be turned off by a full reset, so colors must be re-sent after it.
        out += bo ? "\x1b[1m" : "\x1b[0m";
        if (!bo) curFg = curBg = -2;
        curBold = bo;
      }
      if (f !== curFg) out += f < 0 ? "\x1b[39m" : `\x1b[38;5;${f}m`;
      if (b !== curBg) out += b < 0 ? "\x1b[49m" : `\x1b[48;5;${b}m`;
      curFg = f;
      curBg = b;
      out += this.ch[i];
    }
    return out;
  }
}

/** Width of a string in terminal cells (code points; all glyphs used here are single-width). */
export function textWidth(s: string): number {
  let n = 0;
  for (const _ of s) n++;
  return n;
}

/** Truncates to `max` cells, ending with an ellipsis when cut. */
export function clip(s: string, max: number): string {
  if (textWidth(s) <= max) return s;
  return [...s].slice(0, Math.max(0, max - 1)).join("") + "…";
}

/** A text progress bar of `width` cells. */
export function progressBar(value: number, max: number, width: number): string {
  const filled = max > 0 ? Math.min(width, Math.round((Math.max(0, value) / max) * width)) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** Word-wraps text to `width`; continuation lines are indented by two spaces. */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next) > width && current) {
      lines.push(current);
      current = "  " + word;
    } else {
      current = next;
    }
  }
  lines.push(clip(current, width));
  return lines;
}
