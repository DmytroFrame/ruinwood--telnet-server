/** A unit step on the grid. */
export interface Direction {
  readonly dx: number;
  readonly dy: number;
}

export const Directions = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} as const satisfies Record<string, Direction>;

export type DirectionName = keyof typeof Directions;

export const CARDINALS: readonly Direction[] = Object.values(Directions);

/** Grid distance without diagonals. */
export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
