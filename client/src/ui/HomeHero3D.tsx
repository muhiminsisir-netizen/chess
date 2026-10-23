import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function Chessman({ x, z, type, dark = false }: { x: number; z: number; type: string; dark?: boolean }) {
  const material = dark ? '#44514c' : '#e1c797'
  const profile: [number, number][] = type === 'king'
    ? [[0,0],[.25,0],[.29,.07],[.18,.13],[.16,.38],[.24,.53],[.2,.61],[.11,.68],[.1,.9],[.18,.96],[.18,1.04],[.08,1.09],[.08,1.28],[.035,1.28],[.035,1.48],[0,1.48]]
    : type === 'queen'
      ? [[0,0],[.25,0],[.29,.07],[.18,.13],[.16,.38],[.24,.53],[.2,.61],[.12,.7],[.16,.93],[.1,1.02],[.14,1.1],[.05,1.2],[0,1.23]]
      : type === 'rook'
        ? [[0,0],[.25,0],[.29,.07],[.18,.13],[.16,.4],[.24,.5],[.2,.58],[.2,.95],[.26,.95],[.26,1.08],[.2,1.08],[.2,1.02],[.1,1.02],[.1,1.08],[0,1.08]]
        : [[0,0],[.24,0],[.29,.07],[.18,.13],[.16,.34],[.25,.48],[.19,.55],[.13,.72],[.16,.83],[.13,.99],[.09,1.08],[.04,1.13],[0,1.13]]
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y))
  return <group position={[x, .055, z]}><mesh castShadow receiveShadow><latheGeometry args={[points, 28]} /><meshPhysicalMaterial color={material} metalness={dark ? .4 : .2} roughness={dark ? .28 : .23} clearcoat={.85} clearcoatRoughness={.18} /></mesh>{type==='king'&&<mesh position={[0,1.47,0]} castShadow><boxGeometry args={[.07,.42,.07]} /><meshStandardMaterial color={material} metalness={.4} roughness={.25}/></mesh>}</group>
}

function Showcase() {
  const table = useRef<THREE.Group>(null)
  useFrame(({ clock, pointer }, delta) => {
    if (!table.current) return
    table.current.rotation.y = THREE.MathUtils.damp(table.current.rotation.y, Math.sin(clock.elapsedTime * .16) * .12 + pointer.x * .16, 3, delta)
    table.current.rotation.x = THREE.MathUtils.damp(table.current.rotation.x, -.13 - pointer.y * .08, 3, delta)
    table.current.position.y = .4 + Math.sin(clock.elapsedTime * .8) * .045
  })
  const back = ['rook','knight','bishop','queen','king','bishop','knight','rook']
  return <group ref={table} position={[3.3,.4,0]} scale={.82} rotation={[-.13,.16,0]}>
    <mesh position={[0,-.14,0]} receiveShadow castShadow><boxGeometry args={[8.75,.32,8.75]}/><meshPhysicalMaterial color="#76573c" roughness={.28} metalness={.18} clearcoat={.7}/></mesh>
    {Array.from({length:64},(_,i)=>{const x=i%8-3.5,z=Math.floor(i/8)-3.5;return <mesh key={i} position={[x,.035,z]} receiveShadow><boxGeometry args={[1,.07,1]}/><meshStandardMaterial color={(Math.floor(i/8)+i%8)%2?'#66847a':'#f4ead5'} roughness={.3}/></mesh>})}
    {back.map((type,i)=><Chessman key={`w${type}${i}`} x={i-3.5} z={3.5} type={type}/>)}
    {Array.from({length:8},(_,i)=><Chessman key={`wp${i}`} x={i-3.5} z={2.5} type="pawn"/>)}
    {back.map((type,i)=><Chessman key={`b${type}${i}`} x={i-3.5} z={-3.5} type={type} dark/>)}
    {Array.from({length:8},(_,i)=><Chessman key={`bp${i}`} x={i-3.5} z={-2.5} type="pawn" dark/>)}
    <mesh position={[0,-.52,0]}><boxGeometry args={[9.35,.13,9.35]}/><meshStandardMaterial color="#b89b70" roughness={.3} metalness={.45}/></mesh>
  </group>
}

export default function HomeHero3D() {
  return <div className="hero-canvas"><Canvas shadows dpr={[1,1.5]} camera={{position:[8,9,10],fov:48}}><color attach="background" args={['#f3f1e9']}/><ambientLight intensity={1.5}/><hemisphereLight args={['#ffffff','#89958b',1.4]}/><directionalLight position={[-5,9,7]} intensity={3} castShadow shadow-mapSize={[1024,1024]}/><pointLight position={[5,5,-5]} intensity={60} color="#e2c38c"/><Showcase/><ContactShadows position={[3.3,-.3,0]} opacity={.28} scale={16} blur={3}/></Canvas></div>
}
