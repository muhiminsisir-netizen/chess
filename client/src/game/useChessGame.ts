import { useCallback, useMemo, useRef, useState } from 'react'
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

export interface PieceState {
  id: string
  type: PieceSymbol
  color: Color
  square: Square
}

export interface GameResult {
  outcome: 'white' | 'black' | 'draw'
  reason: string
}

function initialPieces(chess: Chess): PieceState[] {
  const out: PieceState[] = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell) {
        out.push({ id: `${cell.color}${cell.type}-${cell.square}`, type: cell.type, color: cell.color, square: cell.square })
      }
    }
  }
  return out
}

// Keeps stable piece ids across moves so the 3D scene can animate each piece.
function applyMove(pieces: PieceState[], m: Move): PieceState[] {
  const rank = m.from[1]
  let next = pieces
  if (m.captured) {
    const capSq = m.flags.includes('e') ? `${m.to[0]}${rank}` : m.to
    next = next.filter((p) => p.square !== capSq)
  }
  return next.map((p) => {
    if (p.square === m.from) return { ...p, square: m.to, type: m.promotion ?? p.type }
    if (m.flags.includes('k') && p.type === 'r' && p.color === m.color && p.square === `h${rank}`)
      return { ...p, square: `f${rank}` as Square }
    if (m.flags.includes('q') && p.type === 'r' && p.color === m.color && p.square === `a${rank}`)
      return { ...p, square: `d${rank}` as Square }
    return p
  })
}

function getResult(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) return { outcome: chess.turn() === 'w' ? 'black' : 'white', reason: 'Checkmate' }
  if (chess.isStalemate()) return { outcome: 'draw', reason: 'Stalemate' }
  if (chess.isInsufficientMaterial()) return { outcome: 'draw', reason: 'Insufficient material' }
  if (chess.isThreefoldRepetition()) return { outcome: 'draw', reason: 'Threefold repetition' }
  if (chess.isDraw()) return { outcome: 'draw', reason: 'Fifty-move rule' }
  return null
}

export function useChessGame() {
  const chessRef = useRef(new Chess())
  const [fen, setFen] = useState(chessRef.current.fen())
  const [pieces, setPieces] = useState<PieceState[]>(() => initialPieces(chessRef.current))
  const [history, setHistory] = useState<Move[]>([])
  const [selected, setSelected] = useState<Square | null>(null)
  const [pending, setPending] = useState<{ from: Square; to: Square } | null>(null)

  const turn: Color = useMemo(() => chessRef.current.turn(), [fen])
  const result = useMemo(() => getResult(chessRef.current), [fen])
  const inCheck = useMemo(() => chessRef.current.isCheck(), [fen])
  const legalMoves = useMemo(
    () => (selected ? chessRef.current.moves({ square: selected, verbose: true }) : []),
    [selected, fen]
  )
  const checkSquare = inCheck ? pieces.find((p) => p.type === 'k' && p.color === turn)?.square ?? null : null
  const lastMove = history.length ? history[history.length - 1] : null

  const commit = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    const chess = chessRef.current
    try {
      const m = chess.move({ from, to, promotion })
      setPieces((p) => applyMove(p, m))
      setHistory((h) => [...h, m])
      setFen(chess.fen())
    } catch {
      /* illegal move: ignore */
    }
    setSelected(null)
    setPending(null)
  }, [])

  const clickSquare = useCallback(
    (sq: Square) => {
      const chess = chessRef.current
      if (result || pending) return
      if (selected) {
        const matches = chess.moves({ square: selected, verbose: true }).filter((m) => m.to === sq)
        if (matches.length) {
          if (matches[0].promotion) setPending({ from: selected, to: sq })
          else commit(selected, sq)
          return
        }
      }
      const piece = chess.get(sq)
      setSelected(piece && piece.color === chess.turn() ? sq : null)
    },
    [result, pending, selected, commit]
  )

  const choosePromotion = useCallback(
    (type: PieceSymbol) => {
      if (pending) commit(pending.from, pending.to, type)
    },
    [pending, commit]
  )

  const newGame = useCallback(() => {
    chessRef.current = new Chess()
    setFen(chessRef.current.fen())
    setPieces(initialPieces(chessRef.current))
    setHistory([])
    setSelected(null)
    setPending(null)
  }, [])

  const loadPosition = useCallback((fen: string, pgn?: string) => {
    try {
      const next = new Chess()
      if (pgn) next.loadPgn(pgn)
      else next.load(fen)
      chessRef.current = next
      setFen(next.fen())
      setPieces(initialPieces(next))
      setHistory(next.history({ verbose: true }))
      setSelected(null)
      setPending(null)
    } catch { /* Ignore malformed remote snapshots. */ }
  }, [])

  const computerMove = useCallback((depth = 3) => {
    const live = chessRef.current
    if (live.isGameOver() || live.turn() !== 'b') return
    const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
    const requestId = Date.now()
    worker.onmessage = (event: MessageEvent<{requestId:number;move:{from:Square;to:Square;promotion?:PieceSymbol}|null}>) => {
      worker.terminate()
      if (event.data.requestId === requestId && event.data.move && chessRef.current.turn() === 'b') commit(event.data.move.from,event.data.move.to,event.data.move.promotion)
    }
    worker.postMessage({fen:live.fen(),depth:Math.max(1,Math.min(4,depth)),requestId})
  }, [commit])

  return {
    pieces, history, pgn: chessRef.current.pgn(), selected, legalMoves, lastMove, checkSquare,
    turn, inCheck, result, pending, clickSquare, choosePromotion, newGame, computerMove, loadPosition,
  }
}
