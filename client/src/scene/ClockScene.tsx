import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Color } from 'chess.js'

const DIGITS: Record<string, string[]> = {
  '0':['a','b','c','d','e','f'],'1':['b','c'],'2':['a','b','g','e','d'],'3':['a','b','g','c','d'],'4':['f','g','b','c'],'5':['a','f','g','c','d'],'6':['a','f','g','e','c','d'],'7':['a','b','c'],'8':['a','b','c','d','e','f','g'],'9':['a','b','c','d','f','g'],
}
const SEGMENTS: Record<string, [number, number, boolean]> = { a:[0,.052,false],g:[0,0,false],d:[0,-.052,false],f:[-.04,.026,true],b:[.04,.026,true],e:[-.04,-.026,true],c:[.04,-.026,true] }

function ClockDigits({seconds,z,far}:{seconds:number;z:number;far:boolean}) {
  const total=Math.max(0,Math.ceil(seconds)),value=`${String(Math.floor(total/60)).padStart(2,'0')}${String(total%60).padStart(2,'0')}`
  return <group position={[5.12,.405,z]} rotation={[0,far?Math.PI:0,0]}>
    <mesh position={[0,-.006,0]}><boxGeometry args={[.9,.018,.25]}/><meshStandardMaterial color="#d7ddd0" roughness={.48}/></mesh>
    {value.split('').map((digit,index)=><group key={`${index}-${digit}`} position={[(index-1.5)*.18,.008,0]}>{DIGITS[digit].map(seg=>{const[x,pz,vertical]=SEGMENTS[seg];return <mesh key={seg} position={[x,.006,pz]}><boxGeometry args={vertical?[.016,.006,.045]:[.041,.006,.014]}/><meshStandardMaterial color="#172622" roughness={.4}/></mesh>})}{index===1&&<group position={[.088,.006,0]}><mesh position={[0,0,.019]}><sphereGeometry args={[.008,10,8]}/><meshStandardMaterial color="#172622"/></mesh><mesh position={[0,0,-.019]}><sphereGeometry args={[.008,10,8]}/><meshStandardMaterial color="#172622"/></mesh></group>}</group>)}
  </group>
}

function Rocker({z,color,turn,moveKey,lastMoveColor}:{z:number;color:Color;turn:Color;moveKey:number;lastMoveColor?:Color}) {
  const rocker=useRef<THREE.Group>(null),mat=useRef<THREE.MeshPhysicalMaterial>(null),previous=useRef(moveKey),started=useRef(-1)
  useFrame(({clock},dt)=>{
    if(previous.current!==moveKey){previous.current=moveKey;if(lastMoveColor===color)started.current=clock.elapsedTime}
    const t=started.current<0?1:THREE.MathUtils.clamp((clock.elapsedTime-started.current)/.36,0,1),tap=started.current<0?0:Math.sin(Math.PI*t)*.075
    const down=lastMoveColor===color
    if(rocker.current){rocker.current.position.y=THREE.MathUtils.damp(rocker.current.position.y,(down?.07:.18)-tap,18,dt);rocker.current.rotation.x=THREE.MathUtils.damp(rocker.current.rotation.x,(down?-.035:0)-tap*.28,16,dt)}
    if(mat.current)mat.current.emissiveIntensity=THREE.MathUtils.damp(mat.current.emissiveIntensity,turn===color?.12:.015,8,dt)
    if(t>=1)started.current=-1
  })
  return <group position={[5.12,.265,z]}>
    <mesh position={[0,.055,0]} castShadow><boxGeometry args={[1.14,.095,.43]}/><meshStandardMaterial color="#4d1822" metalness={.18} roughness={.43}/></mesh>
    <group ref={rocker} position={[0,.18,0]}>
      <mesh castShadow><boxGeometry args={[1.08,.15,.36]}/><meshPhysicalMaterial ref={mat} color="#eee6c9" emissive="#d8c990" emissiveIntensity={turn===color?.12:.015} roughness={.48} clearcoat={.2}/></mesh>
      <mesh position={[0,.077,0]}><boxGeometry args={[.97,.008,.29]}/><meshStandardMaterial color="#f6f0d9" roughness={.55}/></mesh>
      {[-.09,0,.09].map((x)=><mesh key={x} position={[x,.083,-z*.025]}><boxGeometry args={[.014,.004,.22]}/><meshStandardMaterial color="#e2dac0" roughness={.65}/></mesh>)}
    </group>
  </group>
}

type HandPoint=[number,number,number]
const HAND_FINGERS:HandPoint[][]=[
  [[-.39,.12,-.13],[-.57,.15,-.21],[-.77,.18,-.28],[-.96,.18,-.31]],
  [[-.43,.12,-.04],[-.65,.16,-.05],[-.88,.18,-.06],[-1.06,.17,-.06]],
  [[-.42,.12,.045],[-.6,.17,.09],[-.77,.21,.08],[-.83,.23,-.01],[-.77,.23,-.09]],
  [[-.35,.12,.13],[-.5,.15,.19],[-.63,.19,.17],[-.65,.2,.09]],
]
const THUMB_POINTS:HandPoint[]=[[-.12,.11,.17],[-.27,.16,.23],[-.41,.22,.15],[-.47,.23,.035]]

function taperedFinger(points:HandPoint[],radius:number) {
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal')
  const segments=32,sides=12,frames=path.computeFrenetFrames(segments,false),vertices:number[]=[],indices:number[]=[]
  for(let i=0;i<=segments;i++){
    const t=i/segments,center=path.getPointAt(t)
    const tipEase=Math.min(1,Math.max(.48,Math.sqrt(Math.max(.01,1-t)*1.8)))
    const knuckle=.94+.10*Math.sin(Math.PI*t)
    const r=radius*tipEase*knuckle
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2
      const v=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*.86)
      vertices.push(v.x,v.y,v.z)
      if(i<segments&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1)}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function SculptedFinger({points,skin,radius=.041}:{points:HandPoint[];skin:string;radius?:number}) {
  const geometry=useMemo(()=>taperedFinger(points,radius),[points,radius])
  const tip=points[points.length-1]
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={skin} roughness={.42} clearcoat={.16} sheen={.34}/></mesh>
    <mesh position={[tip[0],tip[1]+.023,tip[2]]} scale={[.043,.009,.025]} castShadow><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#e3c8b7" roughness={.42}/></mesh>
  </group>
}

function crease(points:HandPoint[]) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,.004,6,false)
}

function PressingHand({color,moveKey,lastMoveColor}:{color:Color;moveKey:number;lastMoveColor?:Color}) {
  const hand=useRef<THREE.Group>(null),fingers=useRef<THREE.Group>(null),previous=useRef(moveKey),started=useRef(-1)
  const palmGeometry=useMemo(()=>{
    const shape=new THREE.Shape()
    shape.moveTo(.15,-.145)
    shape.bezierCurveTo(.035,-.2,-.22,-.205,-.4,-.13)
    shape.bezierCurveTo(-.5,-.09,-.53,-.025,-.49,.055)
    shape.bezierCurveTo(-.46,.145,-.34,.205,-.19,.19)
    shape.lineTo(.12,.13);shape.bezierCurveTo(.2,.09,.22,.02,.2,-.06);shape.closePath()
    return new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelSegments:5,steps:2,bevelSize:.027,bevelThickness:.025,curveSegments:24})
  },[])
  const creaseGeometries=useMemo(()=>[
    crease([[-.03,.125,-.13],[-.2,.15,-.105],[-.36,.15,-.04]]),
    crease([[-.025,.13,.105],[-.18,.15,.08],[-.34,.145,.035]]),
    crease([[-.06,.13,-.02],[-.22,.14,.0],[-.39,.13,.025]]),
  ],[])
  useFrame(({clock},dt)=>{
    if(previous.current!==moveKey){previous.current=moveKey;if(lastMoveColor===color)started.current=clock.elapsedTime}
    const elapsed=started.current<0?99:clock.elapsedTime-started.current,duration=.92,t=THREE.MathUtils.clamp(elapsed/duration,0,1)
    if(hand.current){
      hand.current.visible=elapsed<duration
      const reach=t<.4?THREE.MathUtils.smoothstep(t,0,.4):t<.55?1:1-THREE.MathUtils.smoothstep(t,.55,1)
      const approachSide=color==='w'?1:-1
      hand.current.position.z=THREE.MathUtils.damp(hand.current.position.z,approachSide*(2.5-reach*.6),14,dt)
      const press=t>.35&&t<.57?Math.sin(Math.PI*THREE.MathUtils.clamp((t-.35)/.22,0,1))*.09:0
      hand.current.position.y=THREE.MathUtils.damp(hand.current.position.y,.34-press,17,dt)
      hand.current.rotation.z=THREE.MathUtils.damp(hand.current.rotation.z,-reach*.035-press*.12,14,dt)
      hand.current.rotation.x=THREE.MathUtils.damp(hand.current.rotation.x,press*.08,12,dt)
    }
    if(fingers.current){const pressed=elapsed<duration&&t>.35&&t<.57?Math.sin(Math.PI*THREE.MathUtils.clamp((t-.35)/.22,0,1)):0;fingers.current.rotation.z=THREE.MathUtils.damp(fingers.current.rotation.z,pressed*.055,14,dt)}
    if(elapsed>=duration)started.current=-1
  })
  const sleeve=color==='w'?'#303d37':'#272e38',skin=color==='w'?'#b87f61':'#c99575'
  return <group ref={hand} visible={false} position={[5.12,.34,color==='w'?2.5:-2.5]} rotation={[0,color==='w'?-Math.PI/2:Math.PI/2,0]} scale={[1,1,color==='w'?1:-1]}>
    {/* Custom palm silhouette, arched tapered fingers and crossed thumb follow the supplied elegant hand reference. */}
    <mesh position={[.025,.15,0]} rotation={[Math.PI/2,0,0]} geometry={palmGeometry} castShadow receiveShadow><meshPhysicalMaterial color={skin} roughness={.43} clearcoat={.18} sheen={.4}/></mesh>
    <mesh position={[-.16,.19,-.02]} scale={[.21,.045,.14]} castShadow><sphereGeometry args={[1,32,24]}/><meshPhysicalMaterial color={skin} roughness={.44} sheen={.35}/></mesh>
    <group ref={fingers}>
    {HAND_FINGERS.map((points,index)=><group key={index}>
      <mesh position={points[0]} scale={[.067,.055,.054]} castShadow><sphereGeometry args={[1,22,16]}/><meshPhysicalMaterial color={skin} roughness={.45}/></mesh>
      <SculptedFinger points={points} skin={skin} radius={index===1?.044:.039}/>
    </group>)}
    <SculptedFinger points={THUMB_POINTS} skin={skin} radius={.052}/>
    </group>
    {creaseGeometries.map((geometry,index)=><mesh key={index} geometry={geometry}><meshBasicMaterial color={color==='w'?'#9d684f':'#ad795c'} transparent opacity={.34}/></mesh>)}
    {/* Fine jacket sleeve seam and contrasting linen cuff. */}
    <mesh position={[.44,.01,0]} rotation={[0,0,Math.PI/2]} castShadow><capsuleGeometry args={[.19,.58,12,28]}/><meshPhysicalMaterial color={sleeve} roughness={.9} sheen={.2}/></mesh>
    <mesh position={[.145,.018,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.192,.192,.115,40]}/><meshStandardMaterial color="#e4ded0" roughness={.78}/></mesh>
    <mesh position={[.147,.115,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.185,.007,6,40]}/><meshStandardMaterial color="#c1b39c" roughness={.7}/></mesh>
  </group>
}

export default function ClockScene({clocks,turn,moveKey,lastMoveColor}:{clocks:[number,number];turn:Color;moveKey:number;lastMoveColor?:Color}) {
  return <group>
    {/* Burgundy DGT-style case, top LCDs, two cream rocker bars and small front controls. */}
    <mesh position={[5.12,.17,0]} castShadow receiveShadow><boxGeometry args={[1.62,.34,2.18]}/><meshPhysicalMaterial color="#64232d" metalness={.14} roughness={.4} clearcoat={.34}/></mesh>
    <mesh position={[5.12,.345,0]}><boxGeometry args={[1.53,.035,2.09]}/><meshStandardMaterial color="#762d36" metalness={.12} roughness={.43}/></mesh>
    {/* Raised center bridge and molded top ridge echo the physical DGT case. */}
    <mesh position={[5.12,.405,0]} castShadow><boxGeometry args={[1.2,.12,.34]}/><meshPhysicalMaterial color="#702832" metalness={.12} roughness={.4} clearcoat={.28}/></mesh>
    <mesh position={[5.12,.47,0]} castShadow><boxGeometry args={[.82,.035,.24]}/><meshStandardMaterial color="#8a4247" roughness={.45}/></mesh>
    {[-.49,.49].map(z=><group key={z}>
      <mesh position={[5.12,.378,z]}><boxGeometry args={[1.02,.022,.34]}/><meshStandardMaterial color="#481920" roughness={.38}/></mesh>
      <mesh position={[5.12,.394,z]}><boxGeometry args={[.94,.012,.27]}/><meshStandardMaterial color="#171c1b" roughness={.32}/></mesh>
    </group>)}
    <ClockDigits seconds={clocks[0]} z={.49} far={false}/><ClockDigits seconds={clocks[1]} z={-.49} far/>
    <Rocker z={.84} color="w" turn={turn} moveKey={moveKey} lastMoveColor={lastMoveColor}/><Rocker z={-.84} color="b" turn={turn} moveKey={moveKey} lastMoveColor={lastMoveColor}/>
    <mesh position={[4.55,.395,.25]}><boxGeometry args={[.018,.008,.08]}/><meshStandardMaterial color="#d2c398"/></mesh>
    {[[-.35,.55],[.35,.55],[-.35,-.55],[.35,-.55]].map(([x,z])=><mesh key={`${x}-${z}`} position={[5.12+x,.355,z]}><sphereGeometry args={[.025,12,10]}/><meshStandardMaterial color="#dacda7" metalness={.48}/></mesh>)}
    <PressingHand color="w" moveKey={moveKey} lastMoveColor={lastMoveColor}/><PressingHand color="b" moveKey={moveKey} lastMoveColor={lastMoveColor}/>
  </group>
}
