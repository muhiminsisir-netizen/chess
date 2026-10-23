import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { squareToXZ } from './coords'

const PROFILES: Record<PieceSymbol, [number, number][]> = {
  p: [[0,0],[.31,0],[.34,.035],[.34,.075],[.22,.12],[.19,.17],[.15,.23],[.18,.3],[.24,.35],[.21,.4],[.13,.43],[.115,.52],[.16,.57],[.16,.61],[.11,.64],[.1,.72],[0,.72]],
  r: [[0,0],[.34,0],[.37,.035],[.37,.08],[.25,.12],[.22,.18],[.19,.24],[.22,.29],[.25,.34],[.22,.4],[.2,.54],[.26,.58],[.32,.61],[.32,.72],[.28,.75],[.28,.8],[0,.8]],
  n: [[0,0],[.34,0],[.37,.035],[.37,.08],[.25,.12],[.22,.18],[.19,.24],[.22,.29],[.25,.34],[.22,.4],[.17,.49],[.12,.54],[.1,.59],[.14,.64],[.12,.68],[.08,.72],[0,.72]],
  b: [[0,0],[.33,0],[.36,.035],[.36,.08],[.24,.12],[.21,.18],[.18,.25],[.23,.31],[.2,.36],[.13,.48],[.1,.61],[.16,.66],[.17,.7],[.1,.74],[.08,.84],[.13,.89],[.09,.94],[0,.96]],
  q: [[0,0],[.36,0],[.39,.035],[.39,.08],[.27,.12],[.23,.18],[.2,.25],[.25,.31],[.22,.37],[.16,.51],[.13,.65],[.2,.7],[.17,.75],[.12,.8],[.19,.88],[.16,.92],[.12,.99],[.07,1.02],[.07,1.08],[0,1.08]],
  k: [[0,0],[.38,0],[.41,.035],[.41,.08],[.28,.12],[.25,.18],[.21,.25],[.27,.31],[.24,.37],[.17,.52],[.14,.68],[.22,.73],[.2,.78],[.14,.82],[.2,.9],[.17,.95],[.12,.99],[.08,1.04],[.08,1.11],[.05,1.14],[0,1.14]],
}

function BodyMaterial({ color, finish }: { color: Color; finish: string }) {
  const colors = finish === 'gold'
    ? color === 'w' ? '#d6b76e' : '#63452a'
    : finish === 'silver'
      ? color === 'w' ? '#dce1e1' : '#3c4851'
      : color === 'w' ? '#f0e8d8' : '#273330'
  return <meshPhysicalMaterial color={colors} metalness={finish === 'ivory' ? (color === 'w' ? .16 : .56) : .72} roughness={finish === 'ivory' ? .24 : .2} clearcoat={.95} clearcoatRoughness={.12} envMapIntensity={1.1} />
}

function Trim({ y, radius, finish }: { y: number; radius: number; finish: string }) {
  const color = finish === 'silver' ? '#b9c4c6' : finish === 'gold' ? '#f2d994' : '#b89b65'
  return <mesh position={[0,y,0]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[radius,.018,10,48]}/><meshStandardMaterial color={color} metalness={.82} roughness={.2}/></mesh>
}

function KnightHead({ color, finish }: { color: Color; finish: string }) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-.17,.05); s.bezierCurveTo(-.29,.21,-.22,.43,-.08,.5); s.lineTo(-.1,.73); s.quadraticCurveTo(-.02,.8,.03,.7); s.lineTo(.1,.55); s.bezierCurveTo(.27,.56,.33,.41,.28,.31); s.lineTo(.13,.29); s.lineTo(.24,.2); s.quadraticCurveTo(.18,.08,.07,.05); s.closePath()
    return new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:12})
  },[])
  return <group position={[0,.41,-.09]}><mesh geometry={geometry} castShadow><BodyMaterial color={color} finish={finish}/></mesh><mesh position={[.17,.39,.12]}><sphereGeometry args={[.025,12,8]}/><meshStandardMaterial color={finish==='gold'?'#fff0bd':'#bd9a5a'} metalness={.65} roughness={.18}/></mesh><mesh position={[.28,.28,.12]} rotation={[0,0,-.18]}><boxGeometry args={[.12,.026,.02]}/><meshStandardMaterial color={finish==='silver'?'#c8d0cf':'#bb9b65'} metalness={.7} roughness={.22}/></mesh></group>
}

function Details({ type, color, finish }: { type: PieceSymbol; color: Color; finish: string }) {
  const trim = finish === 'silver' ? '#b9c4c6' : '#bd9d61'
  if (type === 'n') return <KnightHead color={color} finish={finish}/>
  if (type === 'p') return <><mesh position={[0,.78,0]} castShadow><sphereGeometry args={[.145,32,24]}/><BodyMaterial color={color} finish={finish}/></mesh><Trim y={.59} radius={.145} finish={finish}/></>
  if (type === 'r') return <><mesh position={[0,.84,0]} castShadow><cylinderGeometry args={[.25,.25,.1,32]}/><BodyMaterial color={color} finish={finish}/></mesh>{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <mesh key={i} position={[Math.cos(a)*.2,.94,Math.sin(a)*.2]} castShadow><boxGeometry args={[.11,.14,.11]}/><BodyMaterial color={color} finish={finish}/></mesh>})}<Trim y={.5} radius={.21} finish={finish}/></>
  if (type === 'b') return <><mesh position={[0,.91,0]} castShadow><sphereGeometry args={[.105,24,18]}/><BodyMaterial color={color} finish={finish}/></mesh><mesh position={[0,.69,.128]} rotation={[0,0,-.48]}><capsuleGeometry args={[.027,.2,5,8]}/><meshStandardMaterial color={trim} metalness={.8} roughness={.2}/></mesh><Trim y={.63} radius={.15} finish={finish}/></>
  if (type === 'q') return <><mesh position={[0,1.12,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.15,.025,10,32]}/><meshStandardMaterial color={trim} metalness={.82} roughness={.19}/></mesh>{Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5;return <mesh key={i} position={[Math.cos(a)*.15,1.2,Math.sin(a)*.15]} castShadow><sphereGeometry args={[.052,18,14]}/><meshStandardMaterial color={trim} metalness={.77} roughness={.18}/></mesh>})}<Trim y={.67} radius={.2} finish={finish}/></>
  return <><mesh position={[0,1.19,0]} castShadow><boxGeometry args={[.07,.27,.07]}/><BodyMaterial color={color} finish={finish}/></mesh><mesh position={[0,1.22,0]} castShadow><boxGeometry args={[.24,.065,.07]}/><meshStandardMaterial color={trim} metalness={.78} roughness={.2}/></mesh><Trim y={.7} radius={.21} finish={finish}/></>
}

const GLYPHS:Record<PieceSymbol,[string,string]>={k:['♔','♚'],q:['♕','♛'],r:['♖','♜'],b:['♗','♝'],n:['♘','♞'],p:['♙','♟']}

function makeFlatTexture(type:PieceSymbol,color:Color,finish:string,design:string) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256
  const ctx=canvas.getContext('2d')
  if(!ctx)return new THREE.CanvasTexture(canvas)
  const glyph=GLYPHS[type][color==='w'?0:1]
  const fill=finish==='gold'?(color==='w'?'#f1d68f':'#76502a'):finish==='silver'?(color==='w'?'#edf1f2':'#38434d'):(color==='w'?'#f4e9d2':'#252d2a')
  const edge=color==='w'?'#5b4731':'#e4cf9e'
  ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.font=`${design==='bold'?'bold ':''}${design==='bold'?226:216}px "Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", serif`
  ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=design==='bold'?13:8
  ctx.strokeStyle=edge;ctx.shadowColor=color==='w'?'#17140f99':'#e5cf8d88';ctx.shadowBlur=design==='bold'?10:5
  ctx.strokeText(glyph,128,128)
  ctx.shadowBlur=0
  if(design==='outline'){
    ctx.lineWidth=6;ctx.strokeStyle=fill;ctx.strokeText(glyph,128,128)
  }else{
    ctx.fillStyle=fill;ctx.fillText(glyph,128,128)
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true
  return texture
}

interface Props { type: PieceSymbol; color: Color; square: Square; onClick: (sq: Square) => void; finish?: string; flat?:boolean; design?:string }

export default function PieceMesh({ type, color, square, onClick, finish = 'ivory',flat=false,design='classic' }: Props) {
  const ref = useRef<THREE.Group>(null)
  const from = useRef(new THREE.Vector3())
  const previousSquare = useRef(square)
  const moveStarted = useRef(0)
  const moving = useRef(false)
  const start = useMemo<[number,number,number]>(() => { const [x,z]=squareToXZ(square); return [x,0,z] }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const profile = useMemo(() => PROFILES[type].map(([r,y])=>new THREE.Vector2(r,y)),[type])
  const flatTexture=useMemo(()=>makeFlatTexture(type,color,finish,design),[type,color,finish,design])
  const [tx,tz] = squareToXZ(square)
  useFrame(({clock},dt) => {
    const mesh=ref.current
    if(!mesh)return
    if(previousSquare.current!==square){previousSquare.current=square;from.current.copy(mesh.position);moveStarted.current=clock.elapsedTime;moving.current=true}
    if(moving.current){
      const t=THREE.MathUtils.clamp((clock.elapsedTime-moveStarted.current)/.62,0,1)
      const eased=t*t*(3-2*t)
      mesh.position.x=THREE.MathUtils.lerp(from.current.x,tx,eased)
      mesh.position.z=THREE.MathUtils.lerp(from.current.z,tz,eased)
      mesh.position.y=from.current.y*(1-eased)+Math.sin(t*Math.PI)*.48
      mesh.rotation.z=Math.sin(t*Math.PI)*.035
      if(t>=1){moving.current=false;mesh.position.set(tx,0,tz);mesh.rotation.z=0}
    }else{mesh.position.x=THREE.MathUtils.damp(mesh.position.x,tx,12,dt);mesh.position.z=THREE.MathUtils.damp(mesh.position.z,tz,12,dt);mesh.position.y=THREE.MathUtils.damp(mesh.position.y,0,12,dt)}
    const targetScale=flat?.9:1.15;mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x,targetScale,9,dt))
  })
  return <group ref={ref} position={start} rotation={[0,!flat&&color==='b'?Math.PI:0,0]} onClick={e=>{e.stopPropagation();onClick(square)}}>
    {flat?<mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.94,.94]}/><meshBasicMaterial map={flatTexture} transparent alphaTest={.025} side={THREE.DoubleSide} toneMapped={false}/></mesh>:<>
      <mesh castShadow receiveShadow><latheGeometry args={[profile,64]}/><BodyMaterial color={color} finish={finish}/></mesh>
      <Trim y={.09} radius={.335} finish={finish}/><Trim y={.16} radius={.23} finish={finish}/>
      <Details type={type} color={color} finish={finish}/>
    </>}
  </group>
}
