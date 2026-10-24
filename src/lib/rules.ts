/** A game is won at `ptw` points with a lead of at least `wb`. */
export const winReached = (a: number, b: number, ptw: number, wb: number) =>
  Math.max(a, b) >= ptw && Math.abs(a - b) >= wb

/** True when the leading team would win the game with its next point. */
export const gamePoint = (a: number, b: number, ptw: number, wb: number) => {
  if (winReached(a, b, ptw, wb)) return false
  const hi = Math.max(a, b), lo = Math.min(a, b)
  return hi + 1 >= ptw && hi + 1 - lo >= wb
}
