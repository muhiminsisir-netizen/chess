import { Chess, type Move } from 'chess.js'

const value = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 } as const
const center = (sq: string) => {
  const file = sq.charCodeAt(0) - 97, rank = Number(sq[1]) - 1
  return (3.5 - Math.abs(3.5 - file)) + (3.5 - Math.abs(3.5 - rank))
}
function evaluate(chess: Chess) {
  if (chess.isCheckmate()) return -100000
  if (chess.isDraw()) return 0
  let total = 0
  for (const row of chess.board()) for (const piece of row) if (piece) {
    const sign = piece.color === 'b' ? 1 : -1
    const [, rank] = piece.square
    const advance = piece.type === 'p' ? (piece.color === 'w' ? Number(rank) - 2 : 7 - Number(rank)) * 7 : 0
    const centerBonus = piece.type === 'k' ? 0 : center(piece.square) * (piece.type === 'p' ? 2 : 4)
    total += sign * (value[piece.type] + advance + centerBonus)
  }
  return chess.turn() === 'b' ? total : -total
}
function search(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (!depth || chess.isGameOver()) return evaluate(chess)
  const moves = chess.moves({ verbose: true }).sort((a,b) => Number(!!b.captured)-Number(!!a.captured))
  let best = -Infinity
  for (const move of moves) {
    chess.move(move)
    const score = -search(chess, depth-1, -beta, -alpha)
    chess.undo()
    if (score > best) best = score
    if (score > alpha) alpha = score
    if (alpha >= beta) break
  }
  return best
}
self.onmessage = (event: MessageEvent<{fen:string; depth:number; requestId:number}>) => {
  const { fen, depth, requestId } = event.data
  try {
    const chess = new Chess(fen)
    const moves: Move[] = chess.moves({ verbose: true }).sort((a,b) => Number(!!b.captured)-Number(!!a.captured))
    let best: Move | null = null, bestScore = -Infinity, alpha = -Infinity
    for (const move of moves) {
      chess.move(move)
      const score = -search(chess, Math.max(0, depth-1), -Infinity, -alpha)
      chess.undo()
      if (score > bestScore) { bestScore=score; best=move }
      if (score > alpha) alpha=score
    }
    self.postMessage({requestId,move:best?{from:best.from,to:best.to,promotion:best.promotion}:null,score:bestScore})
  } catch { self.postMessage({requestId,move:null,error:'Engine could not evaluate this position.'}) }
}
