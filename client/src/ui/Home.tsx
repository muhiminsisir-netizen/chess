import { useEffect, useState, type FormEvent } from 'react'
import { API_BASE } from '../config'
import HomeHero3D from './HomeHero3D'

interface Props {
  onPlay: (mode: 'local' | 'computer' | 'online' | 'friend') => void
}

export default function Home({ onPlay }: Props) {
  const [account, setAccount] = useState(false)
  const [register, setRegister] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState<{played:number;wins:number;losses:number;draws:number;history:{id:string;result:{outcome:string;reason:string};finishedAt:string;pgn:string;players:{userId:string|null;name:string;color:string}[];durationSeconds:number}[]}|null>(null)
  useEffect(()=>{if(!account||!showProfile)return;const token=localStorage.getItem('chess-token');if(!token)return;fetch(`${API_BASE}/api/stats`,{headers:{authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():Promise.reject()).then(setProfile).catch(()=>setMessage('Could not load match history. Start the local server and try again.'))},[account,showProfile])
  const submitAccount = async (e: FormEvent) => {
    e.preventDefault(); setMessage('Connecting…')
    try { const r=await fetch(`${API_BASE}/api/${register?'register':'login'}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email,password})});const d=await r.json();if(!r.ok)throw Error(d.error);localStorage.setItem('chess-token',d.token);localStorage.setItem('chess-name',d.user.name);if(d.user.preferences?.theme)localStorage.setItem('chess-theme',d.user.preferences.theme);if(d.user.preferences?.pieceFinish)localStorage.setItem('chess-finish',d.user.preferences.pieceFinish);if(d.user.preferences?.pieceDesign)localStorage.setItem('chess-piece-design',d.user.preferences.pieceDesign);if(typeof d.user.preferences?.muted==='boolean')localStorage.setItem('chess-muted',String(d.user.preferences.muted));if(Number.isFinite(d.user.preferences?.volume))localStorage.setItem('chess-volume',String(d.user.preferences.volume));setMessage(`Welcome, ${d.user.name}.`);setShowProfile(true) } catch(err){setMessage(err instanceof Error?err.message:'Server is unavailable. Start the local server first.')} }
  return (
    <main className="home">
      <nav className="topbar"><span className="brand-mark">♞</span><span>THE MIDNIGHT TABLE</span><button className="account-link" onClick={()=>{setShowProfile(!!localStorage.getItem('chess-token'));setAccount(true)}}>{localStorage.getItem('chess-name')||'SIGN IN'} ↗</button><span className="nav-note">A CINEMATIC CHESS EXPERIENCE</span></nav>
      <div className="hero">
        <p className="eyebrow">EST. FOR THE LOVE OF THE GAME</p>
        <h1>Every move tells<br/><em>a story.</em></h1>
        <p className="sub">Step into a candlelit arena. Play by the rules, take your time, and make every move count.</p>
        <div className="cta">
          <button className="btn primary" onClick={() => onPlay('computer')}>Play the computer <span>↗</span></button>
          <button className="btn" onClick={() => onPlay('online')}>Find an opponent</button>
          <button className="btn" onClick={() => onPlay('friend')}>Invite a friend</button>
          <button className="btn" onClick={() => onPlay('local')}>Pass and play</button>
        </div>
        <div className="home-meta"><span>♙ &nbsp; FULL CHESS RULES</span><span>◷ &nbsp; TIME CONTROLS</span><span>✦ &nbsp; YOUR TABLE, YOUR WAY</span></div>
      </div>
      <div className="hero-art"><HomeHero3D/><div className="hero-caption">01 — THE OPENING · DRAG TO EXPLORE</div></div>
      <footer className="home-foot">A QUIETER KIND OF COMPETITION <span>SCROLL TO BEGIN</span></footer>
      {account&&<div className="modal-backdrop" onClick={()=>setAccount(false)}><form className="account-modal" onSubmit={submitAccount} onClick={e=>e.stopPropagation()}><button className="drawer-close" type="button" onClick={()=>setAccount(false)}>×</button>{showProfile&&localStorage.getItem('chess-token')?<><p className="eyebrow">PLAYER PROFILE</p><h2>{localStorage.getItem('chess-name')}</h2>{profile?<><div className="profile-stats"><span>{profile.played}<small>PLAYED</small></span><span>{profile.wins}<small>WON</small></span><span>{profile.draws}<small>DREW</small></span><span>{profile.losses}<small>LOST</small></span></div><h3>Recent matches</h3><ol className="profile-history">{profile.history.length?profile.history.map(m=><li key={m.id}><span>{new Date(m.finishedAt).toLocaleDateString()} · {Math.ceil(m.durationSeconds/60)} min</span><b>{m.result.outcome==='draw'?'Draw':`${m.result.outcome} won`}</b><span>{m.result.reason}</span><details><summary>Review moves</summary><p>{m.pgn||'No moves recorded.'}</p></details></li>):<li>No recorded matches yet.</li>}</ol></>:<p>Loading account history…</p>}<p className="account-message">{message}</p><button type="button" className="text-btn" onClick={()=>{localStorage.removeItem('chess-token');localStorage.removeItem('chess-name');setProfile(null);setShowProfile(false);setMessage('You have signed out.')}}>Sign out</button></>:<><p className="eyebrow">YOUR PLAYER ACCOUNT</p><h2>{register?'Join the table.':'Welcome back.'}</h2>{register&&<label>Display name<input required maxLength={32} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label><button className="btn primary" type="submit">{register?'Create account':'Sign in'}</button><p className="account-message">{message}</p><button type="button" className="text-btn" onClick={()=>{setRegister(!register);setMessage('')}}>{register?'I already have an account':'Create a new account'}</button></>}</form></div>}
    </main>
  )
}

