import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { Color, Move, Square } from 'chess.js'
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { ALL_SQUARES, squareToXZ } from './coords'
import PieceMesh from './PieceMesh'
import ClockScene from './ClockScene'
import type { PieceState } from '../game/useChessGame'

interface Props {
  pieces: PieceState[]
  selected: Square | null
  legalMoves: Move[]
  lastMove: Move | null
  checkSquare: Square | null
  onSquareClick: (sq: Square) => void
  theme?: string
  pieceFinish?: string
  lastMoveKey?: number
  lastMoveColor?: Color
  clocks?: [number, number]
  turn?: Color
  introKey?: number
  pieceDesign?:string
}

function CameraFrame() {
  const {camera,size}=useThree()
  useLayoutEffect(()=>{
    const cam=camera as THREE.PerspectiveCamera
    const tangent=Math.tan(THREE.MathUtils.degToRad(cam.fov/2))
    const aspect=Math.max(.45,size.width/Math.max(size.height,1))
    const distance=Math.max(18,15/(2*tangent*aspect))
    // Locked, elevated three-quarter view. The side-mounted clock remains in frame.
    cam.up.set(0,1,0)
    cam.position.set(.8+distance*.12,distance*.72,distance*.68)
    cam.lookAt(.8,0,0)
    cam.updateProjectionMatrix()
  },[camera,size.width,size.height])
  return null
}

function BoardIntro({introKey,children,onSettled}:{introKey:number;children:ReactNode;onSettled:(key:number)=>void}) {
  const group=useRef<THREE.Group>(null),previous=useRef(introKey),started=useRef(-1),initialized=useRef(false)
  useFrame(({clock},dt)=>{
    const first=!initialized.current
    const restarted=previous.current!==introKey
    if(first||restarted){initialized.current=true;previous.current=introKey;started.current=clock.elapsedTime;if(group.current){group.current.rotation.y=Math.PI*2;group.current.position.y=.9;group.current.scale.setScalar(.96)}}
    if(!group.current)return
    if(started.current<0){group.current.rotation.set(0,0,0);group.current.position.y=0;group.current.scale.setScalar(1);return}
    const t=THREE.MathUtils.clamp((clock.elapsedTime-started.current)/1.25,0,1),ease=1-Math.pow(1-t,4)
    group.current.rotation.y=(1-ease)*Math.PI*2
    group.current.position.y=(1-ease)*.9
    group.current.scale.setScalar(.96+.04*ease)
    if(t>=1){group.current.rotation.set(0,0,0);group.current.position.y=0;group.current.scale.setScalar(1);started.current=-1;onSettled(introKey)}
  })
  return <group ref={group}>{children}</group>
}

function Highlight({ sq, color, opacity }: { sq: Square; color: string; opacity: number }) {
  const [x, z] = squareToXZ(sq)
  return (
    <mesh position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

function Board({ onSquareClick, border, darkSquare, lightSquare }: { onSquareClick: (sq: Square) => void; border:string; darkSquare:string; lightSquare:string }) {
  return (
    <group>
      <mesh position={[0, -0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[9.4, 0.5, 9.4]} />
        <meshStandardMaterial color={border} roughness={0.45} metalness={0.5} />
      </mesh>
      {ALL_SQUARES.map((sq) => {
        const [x, z] = squareToXZ(sq)
        const dark = (sq.charCodeAt(0) - 97 + parseInt(sq[1], 10)) % 2 === 1
        return (
          <mesh
            key={sq}
            position={[x, -0.05, z]}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation()
              onSquareClick(sq)
            }}
          >
            <boxGeometry args={[1, 0.1, 1]} />
            <meshStandardMaterial color={dark ? darkSquare : lightSquare} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function ChessScene({ pieces, selected, legalMoves, lastMove, checkSquare, onSquareClick, theme='walnut', pieceFinish='ivory', lastMoveKey=0, lastMoveColor, clocks=[600,600], turn='w',introKey=0,pieceDesign='classic' }: Props) {
  const [settledKey,setSettledKey]=useState<number|null>(null)
  const markSettled=useCallback((key:number)=>setSettledKey(key),[])
  const palettes: Record<string,[string,string,string]> = { walnut:['#211b16','#302218','#907453'], emerald:['#15231f','#20322b','#7e8d78'], slate:['#202428','#292e34','#8e989e'] }
  const [border,darkSquare,lightSquare]=palettes[theme]??palettes.walnut
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [.4, 17, .001], up:[0,0,-1], fov: 38 }}>
      <CameraFrame />
      <color attach="background" args={['#101111']} />
      <fog attach="fog" args={['#101111', 24, 46]} />
      <hemisphereLight args={['#d4d0c6', '#24211d', 1.25]} />
      <directionalLight position={[-6, 10, 4]} intensity={2} color="#fff0d7" />
      <spotLight
        position={[0, 12, 4]}
        angle={0.7}
        penumbra={1}
        intensity={18}
        color="#fff0d5"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#201e1a" roughness={0.88} />
      </mesh>

      <BoardIntro introKey={introKey} onSettled={markSettled}>
      <Board onSquareClick={onSquareClick} border={border} darkSquare={darkSquare} lightSquare={lightSquare} />
      <ClockScene clocks={clocks} turn={turn} moveKey={lastMoveKey} lastMoveColor={lastMoveColor}/>

      {lastMove && (
        <>
          <Highlight sq={lastMove.from} color="#c08a3e" opacity={0.35} />
          <Highlight sq={lastMove.to} color="#c08a3e" opacity={0.5} />
        </>
      )}
      {selected && <Highlight sq={selected} color="#f2c35b" opacity={0.6} />}
      {checkSquare && <Highlight sq={checkSquare} color="#d63b3b" opacity={0.7} />}

      {legalMoves.map((m) => {
        const [x, z] = squareToXZ(m.to)
        const capture = !!m.captured
        return (
          <mesh key={m.to} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            {capture ? <ringGeometry args={[0.36, 0.46, 32]} /> : <circleGeometry args={[0.15, 24]} />}
            <meshBasicMaterial color={capture ? '#e25555' : '#f2c35b'} transparent opacity={0.85} />
          </mesh>
        )
      })}

      {pieces.map((p) => (
        <PieceMesh key={p.id} type={p.type} color={p.color} square={p.square} onClick={onSquareClick} finish={pieceFinish} flat={settledKey===introKey} design={pieceDesign}/>
      ))}
      </BoardIntro>
    </Canvas>
  )
}
