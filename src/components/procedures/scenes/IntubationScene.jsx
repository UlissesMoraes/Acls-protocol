import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", TUBE = "#2B6CB0", BLADE = "#9AA6B2";
const damp = THREE.MathUtils.damp;
const Y = new THREE.Vector3(0, 1, 0);

// Intubação orotraqueal (perfil esquemático): tubo avança pela via aérea até a traqueia.
export default function IntubationScene({ step = 0 }) {
  const head = useRef();
  const tipRef = useRef();   // ponta do TOT (cilindro orientado pela tangente)
  const cuff = useRef();
  const laryngo = useRef();
  const prog = useRef(0.02); // progresso ao longo da via aérea (0–1)

  // Trajeto da via aérea: boca → orofaringe → glote → traqueia
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.5, 0.35, 0),
    new THREE.Vector3(0.6, 0.05, 0),
    new THREE.Vector3(0.08, -0.5, 0),
    new THREE.Vector3(0.0, -1.2, 0),
    new THREE.Vector3(0.0, -1.95, 0),
  ]), []);
  const airwayGeo = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.16, 12, false), [curve]);

  const target = [0.02, 0.02, 0.22, 0.86, 0.93][step] ?? 0.02;

  useFrame((_, dt) => {
    prog.current = damp(prog.current, target, 4, dt);
    const t = THREE.MathUtils.clamp(prog.current, 0.001, 0.999);
    if (tipRef.current) {
      const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      tipRef.current.position.copy(p);
      tipRef.current.quaternion.setFromUnitVectors(Y, tan);
    }
    // Sniffing: leve extensão da cabeça no passo 0
    if (head.current) head.current.rotation.z = damp(head.current.rotation.z, step === 0 ? -0.18 : 0, 5, dt);
    // Cuff infla no passo 4
    if (cuff.current) {
      const s = step >= 4 ? 1 : 0.3;
      cuff.current.scale.x = cuff.current.scale.z = damp(cuff.current.scale.x, s, 6, dt);
    }
    // Laringoscópio insere no passo 2–3
    if (laryngo.current) {
      const on = step === 2 || step === 3;
      laryngo.current.position.x = damp(laryngo.current.position.x, on ? 1.3 : 2.6, 5, dt);
      laryngo.current.visible = laryngo.current.position.x < 2.4;
    }
  });

  return (
    <group position={[0, 0.3, 0]}>
      {/* Cabeça em perfil + mandíbula */}
      <group ref={head}>
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[1.05, 32, 32]} />
          <meshStandardMaterial color={SKIN} roughness={0.85} />
        </mesh>
        <mesh position={[0.95, -0.1, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.7, 0.45, 0.9]} />
          <meshStandardMaterial color={SKIN} roughness={0.85} />
        </mesh>
      </group>

      {/* Via aérea (trilho translúcido) */}
      <mesh geometry={airwayGeo}>
        <meshStandardMaterial color="#7CC0F0" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>

      {/* Cordas vocais / glote (referência) */}
      <mesh position={[0.08, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.03, 10, 20]} />
        <meshStandardMaterial color="#E29A9A" emissive="#C0392B" emissiveIntensity={0.2} />
      </mesh>
      <Html position={[-1.0, -0.5, 0]} center distanceFactor={9}>
        <div style={lbl}>cordas vocais</div>
      </Html>

      {/* TOT — ponta + cuff */}
      <group ref={tipRef}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 16]} />
          <meshStandardMaterial color={TUBE} roughness={0.5} />
        </mesh>
        <mesh ref={cuff} position={[0, 0.05, 0]} scale={[0.3, 1, 0.3]}>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color="#A5D8FC" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Laringoscópio (entra pela direita) */}
      <group ref={laryngo} position={[2.6, -0.1, 0]}>
        <mesh position={[0.45, 0.35, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.09, 0.09, 1, 16]} />
          <meshStandardMaterial color="#2D3640" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.9, 0.08, 0.18]} />
          <meshStandardMaterial color={BLADE} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

const lbl = {
  background: "rgba(15,20,26,.85)", color: "#fff", fontSize: 11, fontWeight: 600,
  padding: "4px 8px", borderRadius: 6, fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap", pointerEvents: "none",
};
