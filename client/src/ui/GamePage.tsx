import { Component, Suspense, lazy, type ReactNode } from 'react'
import { useChessGame } from '../game/useChessGame'
import { useEffect, useRef, useState } from 'react'
import { API_BASE, WS_URL } from '../config'
const ChessScene = lazy(() => import('../scene/ChessScene'))

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="fallback">The 3D scene could not start on this device (WebGL unavailable).</div>
    ) : (
      this.props.children
    )
  }
}

type Mode = 'local' | 'computer' | 'online' | 'friend'
const formatClock = (seconds: number) => { const total=Math.max(0,Math.ceil(seconds));return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}` }
const sound = (kind: 'move' | 'capture' | 'check', volume: number) => {
  try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = kind === 'capture' ? 250 : kind === 'check' ? 740 : 420; osc.type = 'sine'; gain.gain.setValueAtTime(0.035 * volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + .12); osc.start(); osc.stop(ctx.currentTime + .12); osc.onended = () => void ctx.close() } catch { /* Audio is an optional enhancement. */ }
}
const clockPressSound = (volume:number) => {
  if(volume<=0)return
  try {
    const ctx=new AudioContext(),now=ctx.currentTime
    const tick=ctx.createOscillator(),tickGain=ctx.createGain()
    tick.type='square';tick.frequency.setValueAtTime(1180,now);tick.frequency.exponentialRampToValueAtTime(520,now+.025)
    tickGain.gain.setValueAtTime(.026*volume,now);tickGain.gain.exponentialRampToValueAtTime(.001,now+.045)
    tick.connect(tickGain);tickGain.connect(ctx.destination);tick.start(now);tick.stop(now+.05)
    const thud=ctx.createOscillator(),thudGain=ctx.createGain()
    thud.type='triangle';thud.frequency.setValueAtTime(155,now);thud.frequency.exponentialRampToValueAtTime(82,now+.09)
    thudGain.gain.setValueAtTime(.05*volume,now);thudGain.gain.exponentialRampToValueAtTime(.001,now+.11)
    thud.connect(thudGain);thudGain.connect(ctx.destination);thud.start(now);thud.stop(now+.12)
    thud.onended=()=>void ctx.close()
  } catch { /* Audio is an optional enhancement. */ }
}

export default function GamePage({ onExit, mode }: { onExit: () => void; mode: Mode }) {
  const g = useChessGame()
  const [theme, setTheme] = useState(()=>localStorage.getItem('chess-theme')||'walnut')
  const [pieceFinish, setPieceFinish] = useState(()=>localStorage.getItem('chess-finish')||'ivory')
  const [pieceDesign,setPieceDesign] = useState(()=>localStorage.getItem('chess-piece-design')||'classic')
  const [muted, setMuted] = useState(()=>localStorage.getItem('chess-muted')==='true')
  const [volume, setVolume] = useState(()=>Number(localStorage.getItem('chess-volume')??0.7))
  const [settings, setSettings] = useState(false)
  const [baseTime, setBaseTime] = useState(600)
  const [increment, setIncrement] = useState(0)
  const [clocks, setClocks] = useState<[number, number]>([600, 600])
  const [started, setStarted] = useState(false)
  const [introKey,setIntroKey] = useState(0)
  const [manualResult, setManualResult] = useState<{outcome:'white'|'black'|'draw';reason:string}|null>(null)
  const [serverResult, setServerResult] = useState<{outcome:'white'|'black'|'draw';reason:string}|null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [drawOffer, setDrawOffer] = useState(false)
  const [engineDepth, setEngineDepth] = useState(3)
  const [connection, setConnection] = useState(mode === 'local' || mode === 'computer' ? 'Ready' : 'Connecting…')
  const [myColor, setMyColor] = useState<'w'|'b'|null>(null)
  const socketRef = useRef<WebSocket|null>(null)
  const localMove = useRef(false)
  const clockedPly = useRef(0)
  const soundedPly = useRef(0)
  const savedResultKey = useRef<string|null>(null)
  useEffect(()=>{
    localStorage.setItem('chess-theme',theme);localStorage.setItem('chess-finish',pieceFinish);localStorage.setItem('chess-piece-design',pieceDesign);localStorage.setItem('chess-muted',String(muted));localStorage.setItem('chess-volume',String(volume))
    const token=localStorage.getItem('chess-token')
    if(token){
      void fetch(`${API_BASE}/api/preferences`,{
        method:'POST',
        headers:{'content-type':'application/json',authorization:`Bearer ${token}`},
        body:JSON.stringify({preferences:{theme,pieceFinish,pieceDesign,muted,volume}}),
      }).catch(()=>{})
    }
  },[theme,pieceFinish,pieceDesign,muted,volume])

  useEffect(() => { if (mode === 'computer' && g.turn === 'b' && !g.result && !manualResult) { const id = window.setTimeout(() => g.computerMove(engineDepth), 120); return () => window.clearTimeout(id) } }, [mode, g.turn, g.result, g.computerMove, manualResult, engineDepth])
  useEffect(() => { if (started && !g.result && !manualResult) { const id = window.setInterval(() => setClocks(([w,b]) => g.turn === 'w' ? [Math.max(0,w-1),b] : [w,Math.max(0,b-1)]),1000); return () => window.clearInterval(id) } }, [started,g.turn,g.result,manualResult])
  useEffect(() => {
    if (!g.history.length) { clockedPly.current=0; soundedPly.current=0; return }
    const m=g.history[g.history.length-1]
    if (g.history.length>soundedPly.current) {
      soundedPly.current=g.history.length
      if(!muted){clockPressSound(volume);if(g.inCheck||m.captured)sound(g.inCheck?'check':'capture',volume)}
    }
    setStarted(true)
    if((mode==='local'||mode==='computer')&&g.history.length>clockedPly.current){clockedPly.current=g.history.length;if(increment)setClocks(([w,b])=>m.color==='w'?[w+increment,b]:[w,b+increment])}
  }, [g.history.length,mode,increment,volume,muted,g.inCheck])
  useEffect(() => { if (clocks[0] === 0 || clocks[1] === 0) { setStarted(false); if(!g.result&&!manualResult)setManualResult({outcome:clocks[0]===0?'black':'white',reason:'Timeout'}) } }, [clocks,g.result,manualResult])
  useEffect(() => {
    if (mode !== 'online' && mode !== 'friend') return
    let stopped=false, firstConnection=true, retryTimer=0, fallbackTried=false
    let sid=localStorage.getItem('chess-session-id')
    if(!sid){sid=crypto.randomUUID();localStorage.setItem('chess-session-id',sid)}
    const token=localStorage.getItem('chess-token')||''
    const roomFromUrl=new URLSearchParams(location.search).get('room')
    const sessionData=()=>({sid,token,name:localStorage.getItem('chess-name')||'Guest',seconds:baseTime,increment,room:roomFromUrl||roomCode})
    const connect=(resume:boolean)=>{
      if(stopped)return
      const ws=new WebSocket(WS_URL);socketRef.current=ws
      ws.onopen=()=>{setConnection(resume?'Restoring match…':'Connected');const event=resume?'resume':roomFromUrl?'join':mode==='friend'?'create':'matchmake';ws.send(JSON.stringify({event,data:sessionData()}))}
      ws.onmessage=(event)=>{try{const m=JSON.parse(event.data),d=m.data||{};if(m.event==='joined'){fallbackTried=false;setMyColor(d.color);setRoomCode(d.room);g.loadPosition(d.state.fen,d.state.pgn);setClocks(d.state.clocks.map(Math.ceil) as [number,number]);setConnection(d.state.players.filter(Boolean).length===2?'In game':'Waiting for a player…');setStarted(d.state.started);if(d.state.started)setIntroKey(k=>k+1);setServerResult(d.state.result||null)}else if(m.event==='draw_offer'){setDrawOffer(true)}else if(m.event==='error'){if(resume&&d.message?.includes('already connected')){ws.onclose=null;ws.close();window.setTimeout(()=>connect(true),700);return}if(resume&&!fallbackTried){fallbackTried=true;ws.onclose=null;ws.close();window.setTimeout(()=>connect(false),120);return}setConnection(d.message||'Connection error')}else if(['state','start','move','result','clock','presence'].includes(m.event)){localMove.current=false;if(d.fen)g.loadPosition(d.fen,d.pgn);if(d.clocks)setClocks(d.clocks.map(Math.ceil) as [number,number]);if(m.event==='presence'&&d.players?.some((player:{connected:boolean}|null)=>player&&!player.connected))setConnection('Opponent disconnected · 60 second reconnect window');else if(d.players?.length===2&&d.players.every(Boolean))setConnection('In game');if(m.event==='start'){setStarted(true);setIntroKey(k=>k+1)}if(m.event==='result'){setStarted(false);setServerResult(d.result||null);setConnection(d.result?.reason||'Match complete')}}}catch{setConnection('Connection error')}}
      ws.onclose=()=>{if(!stopped){setConnection('Reconnecting…');retryTimer=window.setTimeout(()=>connect(true),1000);firstConnection=false}}
      ws.onerror=()=>setConnection('Connection interrupted')
    }
    connect(false)
    return()=>{stopped=true;window.clearTimeout(retryTimer);socketRef.current?.close();socketRef.current=null}
  // Match sockets use the session values captured when this game view starts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mode])
  useEffect(()=>{if(!localMove.current||!g.history.length)return;localMove.current=false;const m=g.history[g.history.length-1];if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify({event:'move',data:{from:m.from,to:m.to,promotion:m.promotion}}))},[g.history.length])
  const beginGame = () => { g.newGame(); setManualResult(null); setServerResult(null); savedResultKey.current=null; clockedPly.current=0; setClocks([baseTime,baseTime]); setStarted(true); setIntroKey(k=>k+1) }
  const rows: { n: number; w: string; b?: string }[] = []
  for (let i = 0; i < g.history.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: g.history[i].san, b: g.history[i + 1]?.san })
  }

  const result = serverResult ?? manualResult ?? g.result
  useEffect(()=>{
    if(!result||mode==='online'||mode==='friend')return
    const token=localStorage.getItem('chess-token');if(!token)return
    const key=`${g.pgn}:${result.outcome}:${result.reason}`;if(savedResultKey.current===key)return;savedResultKey.current=key
    void fetch(`${API_BASE}/api/matches/local`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({pgn:g.pgn,result,mode,durationSeconds:Math.max(0,Math.round(baseTime*2-clocks[0]-clocks[1]))})}).catch(()=>{})
  },[result,mode,g.pgn,baseTime,clocks])
  const status = result
    ? result.outcome === 'draw'
      ? `Draw — ${result.reason}`
      : `${result.outcome === 'white' ? 'White' : 'Black'} wins — ${result.reason}`
    : `${g.turn === 'w' ? 'White' : 'Black'} to move${g.inCheck ? ' — check!' : ''}`

  return (
    <div className={`game theme-${theme}`}>
      <header className="gamebar"><button className="text-btn" onClick={onExit}>← ARENA</button><div className="brand-small">♞ &nbsp; MIDNIGHT TABLE</div><div className="gamebar-right"><span className="mode-pill">{mode === 'computer' ? 'COMPUTER MATCH' : mode === 'online' ? 'QUICK MATCH' : mode === 'friend' ? 'FRIEND ROOM' : 'LOCAL MATCH'}</span><button className="icon-btn" onClick={() => setSettings(!settings)} aria-label="Open settings">⚙</button></div></header>
      <div className="stage">
        <SceneBoundary>
          <Suspense fallback={<div className="fallback">Preparing the chess arena…</div>}><ChessScene
            pieces={g.pieces}
            selected={g.selected}
            legalMoves={g.legalMoves}
            lastMove={g.lastMove}
            checkSquare={g.checkSquare}
            onSquareClick={(sq)=>{if(result)return;if((mode==='online'||mode==='friend')&&(myColor!==g.turn||!started&&connection!=='In game'))return;localMove.current=true;g.clickSquare(sq)}}
            theme={theme}
            pieceFinish={pieceFinish}
            pieceDesign={pieceDesign}
            lastMoveKey={g.history.length}
            lastMoveColor={g.lastMove?.color}
            clocks={clocks}
            turn={g.turn}
            introKey={introKey}
          /></Suspense>
        </SceneBoundary>
        {(() => {
          const localColor = myColor ?? 'w'
          const localIsWhite = localColor === 'w'
          return <>
            <div className={`scene-clock ${localIsWhite?'far-side':'near-side'} ${g.turn !== localColor && started && !result ? 'is-active' : ''}`} aria-label={`Opponent time ${formatClock(clocks[localIsWhite ? 1 : 0])}`}>
              <span>OPPONENT</span><strong>{formatClock(clocks[localIsWhite ? 1 : 0])}</strong>
            </div>
            <div className={`scene-clock ${localIsWhite?'near-side':'far-side'} ${g.turn === localColor && started && !result ? 'is-active' : ''}`} aria-label={`Your time ${formatClock(clocks[localIsWhite ? 0 : 1])}`}>
              <span>YOU</span><strong>{formatClock(clocks[localIsWhite ? 0 : 1])}</strong>
            </div>
          </>
        })()}
        {g.pending && (
          <div className="promo">
            <p>Promote to</p>
            {(['q', 'r', 'b', 'n'] as const).map((t) => (
              <button key={t} className="btn" onClick={() => g.choosePromotion(t)}>
                {{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[t]}
              </button>
            ))}
          </div>
        )}
      </div>
      <aside className="panel">
        {(mode === 'online' || mode === 'friend') && <div className="connection"><span className="connection-dot"/>{connection}{roomCode&&<button onClick={()=>void navigator.clipboard?.writeText(`${location.origin}/?room=${roomCode}`)} title="Copy invite link">{roomCode} · copy invite</button>}</div>}
        <div className="player-card"><span className="avatar">{mode === 'computer' ? '♟' : 'W'}</span><div><strong>{mode === 'computer' ? 'You' : 'White'}</strong><small>{mode === 'computer' ? 'White pieces' : 'Guest player'}</small></div><b className={g.turn === 'w' ? 'clock active' : 'clock'}>{formatClock(clocks[0])}</b></div>
        <h2>{status}</h2>
        <div className="player-card opponent"><span className="avatar">{mode === 'computer' ? '♞' : 'B'}</span><div><strong>{mode === 'computer' ? 'The House' : mode === 'friend' ? 'Friend' : 'Black'}</strong><small>{mode === 'computer' ? 'Local search engine' : 'Guest player'}</small></div><b className={g.turn === 'b' ? 'clock active' : 'clock'}>{formatClock(clocks[1])}</b></div>
        <ol className="moves">
          {rows.map((r) => (
            <li key={r.n}>
              <span>{r.n}.</span> <span>{r.w}</span> <span>{r.b ?? ''}</span>
            </li>
          ))}
        </ol>
        <div className="actions">
          {mode !== 'online' && mode !== 'friend' && <button className="btn primary" onClick={beginGame}>New Game</button>}
          {(mode === 'online' || mode === 'friend') ? <><button className="btn" onClick={()=>socketRef.current?.send(JSON.stringify({event:'resign',data:{}}))}>Resign</button><button className="btn" onClick={()=>socketRef.current?.send(JSON.stringify({event:drawOffer?'draw_accept':'draw_offer',data:{}}))}>{drawOffer?'Accept draw':'Offer draw'}</button></> : <button className="btn" onClick={()=>{setManualResult({outcome:g.turn==='w'?'black':'white',reason:'Resignation'});setStarted(false)}}>Resign</button>}
          {mode==='online'&&connection==='Waiting for a player…'&&<button className="btn" onClick={()=>{socketRef.current?.send(JSON.stringify({event:'cancel',data:{}}));setConnection('Search cancelled');window.setTimeout(onExit,150)}}>Cancel search</button>}
          {mode === 'local' && !result && <button className="btn" onClick={()=>{if(window.confirm('Agree to a draw?')){setManualResult({outcome:'draw',reason:'Draw by agreement'});setStarted(false)}}}>Offer draw</button>}
          {mode === 'friend' && roomCode && <button className="btn" onClick={()=>void navigator.clipboard?.writeText(`${location.origin}/?room=${roomCode}`)}>Copy friend invite</button>}
          <button className="btn" onClick={() => setSettings(!settings)}>Customize</button>
          <button className="btn" onClick={() => setMuted(!muted)}>{muted ? 'Sound off' : 'Sound on'}</button>
        </div>
      </aside>
      {settings && <section className="settings-drawer"><button className="drawer-close" onClick={() => setSettings(false)}>×</button><p className="eyebrow">TABLE SETTINGS</p><h2>Make it yours.</h2><label>Board finish<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="walnut">Dark walnut & ivory</option><option value="emerald">Forest & cream</option><option value="slate">Graphite & pearl</option></select></label><label>Piece design<select value={pieceDesign} onChange={e=>setPieceDesign(e.target.value)}><option value="classic">Classic Staunton</option><option value="bold">Bold tournament</option><option value="outline">Fine outline</option></select></label><label>Piece finish<select value={pieceFinish} onChange={e=>setPieceFinish(e.target.value)}><option value="ivory">Ivory & obsidian</option><option value="gold">Antique gold</option><option value="silver">Silver & graphite</option></select></label><label>Time control<select disabled={started&&(mode==='online'||mode==='friend')} value={`${baseTime}:${increment}`} onChange={e=>{if(started&&(mode==='online'||mode==='friend'))return;const [t,inc]=e.target.value.split(':').map(Number);setBaseTime(t);setIncrement(inc);setClocks([t,t]);if(mode==='online'||mode==='friend')socketRef.current?.send(JSON.stringify({event:'configure',data:{seconds:t,increment:inc}}))}}><option value="60:0">Bullet · 1+0</option><option value="120:1">Bullet · 2+1</option><option value="180:0">Blitz · 3+0</option><option value="180:2">Blitz · 3+2</option><option value="300:0">Blitz · 5+0</option><option value="600:0">Rapid · 10+0</option><option value="600:5">Rapid · 10+5</option><option value="900:10">Rapid · 15+10</option></select></label><label>Sound volume<input type='range' min='0' max='1' step='0.05' value={volume} onChange={e=>setVolume(Number(e.target.value))}/><small>{Math.round(volume*100)}%</small></label>{mode==='computer'&&<label>Computer search<select value={engineDepth} onChange={e=>setEngineDepth(Number(e.target.value))}><option value={1}>Casual · 1 ply</option><option value={2}>Club · 2 ply</option><option value={3}>Advanced · 3 ply</option><option value={4}>Deep · 4 ply (slower)</option></select></label>}<p className="drawer-note">Piece sets and finishes save on this device and, when signed in, to your account. The 3D pieces turn into your selected 2D set after the board's opening animation.</p></section>}
      {result&&<div className="modal-backdrop result-backdrop"><section className="result-modal"><p className="eyebrow">MATCH COMPLETE</p><h2>{status}</h2><p>{mode==='computer'?'The House engine':mode==='online'?'Quick match':mode==='friend'?'Friend match':'Local game'} · {Math.max(0,Math.ceil((baseTime*2-clocks[0]-clocks[1])/60))} min</p><ol className="result-moves">{rows.map(r=><li key={r.n}>{r.n}. {r.w} {r.b||''}</li>)}</ol><button className="btn primary" onClick={()=>{if(mode==='local'||mode==='computer')beginGame();else onExit()}}>Play again</button><button className="btn" onClick={onExit}>Return to lobby</button></section></div>}
    </div>
  )
}

