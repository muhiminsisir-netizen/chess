import type { Square } from 'chess.js'

// a1 is at the near-left corner for White (camera on +z side).
export function squareToXZ(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - 97
  const rank = parseInt(sq[1], 10)
  return [file - 3.5, 3.5 - (rank - 1)]
}

export const ALL_SQUARES: Square[] = (() => {
  const out: Square[] = []
  for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) out.push(`${String.fromCharCode(97 + f)}${r}` as Square)
  return out
})()
