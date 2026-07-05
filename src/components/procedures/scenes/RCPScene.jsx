import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", HAND = "#D9A57E", PAD = "#2D3640", PADFACE = "#C0392B";
const damp = THREE.MathUtils.damp;
const RATE = 110 / 60; // compressões/s (110 bpm)

// RCP em boneco humano (cabeça/tórax/abdome/braços) — compressões com
// deformação do tórax, braços do socorrista estendidos e pás de desfibrilação.
export default function RCPScene({ step = 0 }) {
  const rescuer = useRef();
  const chest = useRef();
  const flash = useRef();
  const pads = useRef();

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const compress = step === 1 || step === 4;
    const depth = compress ? ((1 - Math.cos(t * RATE * Math.PI * 2)) / 2) * 0.3 : 0;
    const lift = step === 2 || step === 3 ? 0.5 : 0;
    if (rescuer.current) rescuer.current.position.y = damp(rescuer.current.position.y, 0.62 + lift, 8, dt) - depth;
    // Tórax deforma junto com a compressão (retorno completo)
    if (chest.current) chest.current.scale.y = 0.92 - depth * 0.5;
    if (pads.current) {
      const s = step >= 2 ? 1 : 0.001;
      pads.current.scale.setScalar(damp(pads.current.scale.x, s, 7, dt));
    }
    if (flash.current) {
      const target = step === 3 ? (0.6 + 0.4 * Math.sin(t * 12)) : 0;
      flash.current.material.emissiveIntensity = damp(flash.current.material.emissiveIntensity, target, 8, dt);
    }
  });

  return (
    <group position={[0, -0.1, 0]}>
      {/* ── Paciente em decúbito dorsal ── */}
      {/* Cabeça + pescoço */}
      <mesh position={[-2.25, 0.28, 0]} scale={[0.95, 0.85, 0.8]}>
        <sphereGeometry args={[0.52, 28, 24]} /><meshStandardMaterial color={SKIN} roughness={0.85} />
      </mesh>
      <mesh position={[-1.72, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.24, 0.5, 18]} /><meshStandardMaterial color={SKIN} roughness={0.85} />
      </mesh>
      {/* Tórax (deforma na compressão) */}
      <mesh ref={chest} position={[-0.55, 0.1, 0]} scale={[1, 0.92, 1]}>
        <sphereGeometry args={[1, 40, 32]} />
        <meshStandardMaterial color={SKIN} roughness={0.85} />
      </mesh>
      {/* Ombros */}
      <mesh position={[-1.15, 0.25, 0.85]}><sphereGeometry args={[0.32, 20, 16]} /><meshStandardMaterial color={SKIN} roughness={0.85} /></mesh>
      <mesh position={[-1.15, 0.25, -0.85]}><sphereGeometry args={[0.32, 20, 16]} /><meshStandardMaterial color={SKIN} roughness={0.85} /></mesh>
      {/* Braços ao longo do corpo */}
      <mesh position={[-0.1, 0.02, 1.05]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.16, 1.9, 8, 14]} /><meshStandardMaterial color={SKIN} roughness={0.9} />
      </mesh>
      <mesh position={[-0.1, 0.02, -1.05]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.16, 1.9, 8, 14]} /><meshStandardMaterial color={SKIN} roughness={0.9} />
      </mesh>
      {/* Abdome + membros inferiores (indicação) */}
      <mesh position={[0.85, 0.02, 0]} scale={[1.15, 0.68, 0.85]}>
        <sphereGeometry args={[0.85, 30, 24]} /><meshStandardMaterial color={SKIN} roughness={0.88} />
      </mesh>
      <mesh position={[2.35, -0.08, 0.32]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.22, 1.7, 8, 14]} /><meshStandardMaterial color={SKIN} roughness={0.9} />
      </mesh>
      <mesh position={[2.35, -0.08, -0.32]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.22, 1.7, 8, 14]} /><meshStandardMaterial color={SKIN} roughness={0.9} />
      </mesh>

      {/* Esterno (referência da metade inferior) */}
      <mesh position={[-0.55, 0.72, 0]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[1.0, 0.16, 0.2]} />
        <meshStandardMaterial color="#F0E9DC" roughness={0.7} transparent opacity={0.85} />
      </mesh>

      {/* Flash do choque */}
      <mesh ref={flash} position={[-0.55, 0.1, 0]} scale={[1.03, 0.95, 1.03]}>
        <sphereGeometry args={[1.02, 24, 20]} />
        <meshStandardMaterial color="#F6C453" transparent opacity={0.18} emissive="#F6C453" emissiveIntensity={0} depthWrite={false} />
      </mesh>

      {/* ── Socorrista: mãos sobrepostas + braços ESTENDIDOS ── */}
      <group ref={rescuer} position={[-0.45, 0.62, 0]}>
        {/* Mão de baixo (base) e mão de cima entrelaçada */}
        <mesh position={[0, 0.07, 0]} rotation={[0, 0.2, 0]}>
          <boxGeometry args={[0.5, 0.16, 0.62]} /><meshStandardMaterial color={SKIN} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, -0.25, 0]}>
          <boxGeometry args={[0.48, 0.16, 0.58]} /><meshStandardMaterial color={HAND} roughness={0.85} />
        </mesh>
        {/* Antebraços/braços retos (verticais — cotovelo estendido) */}
        <mesh position={[0.1, 1.15, 0.16]} rotation={[0.08, 0, -0.05]}>
          <capsuleGeometry args={[0.13, 1.6, 8, 14]} /><meshStandardMaterial color={HAND} roughness={0.9} />
        </mesh>
        <mesh position={[0.1, 1.15, -0.16]} rotation={[-0.08, 0, -0.05]}>
          <capsuleGeometry args={[0.13, 1.6, 8, 14]} /><meshStandardMaterial color={HAND} roughness={0.9} />
        </mesh>
      </group>

      {/* ── Pás esterno-ápice ── */}
      <group ref={pads} scale={0.001}>
        <group position={[-1.3, 0.75, 0.55]} rotation={[0.5, 0, 0]}>
          <mesh><cylinderGeometry args={[0.28, 0.28, 0.14, 24]} /><meshStandardMaterial color={PAD} /></mesh>
          <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.24, 0.24, 0.04, 24]} /><meshStandardMaterial color={PADFACE} emissive={PADFACE} emissiveIntensity={0.2} /></mesh>
        </group>
        <group position={[0.25, 0.45, -0.85]} rotation={[-0.7, 0, 0]}>
          <mesh><cylinderGeometry args={[0.28, 0.28, 0.14, 24]} /><meshStandardMaterial color={PAD} /></mesh>
          <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.24, 0.24, 0.04, 24]} /><meshStandardMaterial color={PADFACE} emissive={PADFACE} emissiveIntensity={0.2} /></mesh>
        </group>
        <Html position={[-1.3, 1.35, 0.55]} center distanceFactor={11}><div style={lbl}>infraclavicular D</div></Html>
        <Html position={[0.25, 1.0, -1.3]} center distanceFactor={11}><div style={lbl}>ápice (axilar méd. E)</div></Html>
      </group>

      {(step === 1 || step === 4) && (
        <Html position={[-0.5, 1.9, 0]} center distanceFactor={11}>
          <div style={lbl}>5–6 cm · 100–120/min · braços retos</div>
        </Html>
      )}
    </group>
  );
}

const lbl = {
  background: "rgba(15,20,26,.85)", color: "#fff", fontSize: 11, fontWeight: 600,
  padding: "4px 8px", borderRadius: 6, fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap", pointerEvents: "none",
};
