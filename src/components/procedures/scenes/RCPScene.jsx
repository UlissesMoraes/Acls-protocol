import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", HAND = "#D9A57E", PAD = "#2D3640", PADFACE = "#C0392B";
const damp = THREE.MathUtils.damp;
const RATE = 110 / 60; // Hz (compressões/min)

// RCP: compressões e posicionamento das pás (tórax esquemático).
export default function RCPScene({ step = 0 }) {
  const hands = useRef();
  const flash = useRef();
  const pads = useRef();

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const compress = step === 1 || step === 4;
    const depth = compress ? ((1 - Math.cos(t * RATE * Math.PI * 2)) / 2) * 0.28 : 0;
    const lift = step === 2 || step === 3 ? 0.35 : 0; // afasta as mãos ao manejar as pás
    if (hands.current) hands.current.position.y = damp(hands.current.position.y, -0.15 + lift, 8, dt) - depth;
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
    <group position={[0, 0.1, 0]}>
      {/* Tórax */}
      <mesh scale={[1.6, 0.95, 0.85]}>
        <sphereGeometry args={[1, 40, 32]} />
        <meshStandardMaterial color={SKIN} roughness={0.85} />
      </mesh>
      {/* Esterno */}
      <mesh position={[0, 0.05, 0.78]} scale={[1, 1, 0.3]}>
        <boxGeometry args={[0.22, 1.1, 0.2]} />
        <meshStandardMaterial color="#F0E9DC" roughness={0.7} />
      </mesh>
      {/* Flash do choque */}
      <mesh ref={flash} scale={[1.62, 0.97, 0.87]}>
        <sphereGeometry args={[1.02, 24, 20]} />
        <meshStandardMaterial color="#F6C453" transparent opacity={0.18} emissive="#F6C453" emissiveIntensity={0} />
      </mesh>

      {/* Mãos sobrepostas no centro do tórax (metade inferior do esterno) */}
      <group ref={hands} position={[0, -0.15, 0.95]}>
        <mesh position={[0, 0.07, 0]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.45, 0.18, 0.6]} />
          <meshStandardMaterial color={HAND} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.05, 0]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.45, 0.16, 0.58]} />
          <meshStandardMaterial color={SKIN} roughness={0.85} />
        </mesh>
      </group>

      {/* Pás esterno-ápice (aparecem no passo 2) */}
      <group ref={pads} scale={0.001}>
        {/* Infraclavicular direita (à esquerda na nossa vista) */}
        <group position={[-0.95, 0.6, 0.7]}>
          <mesh><cylinderGeometry args={[0.28, 0.28, 0.16, 24]} /><meshStandardMaterial color={PAD} /></mesh>
          <mesh position={[0, 0, 0.09]}><cylinderGeometry args={[0.24, 0.24, 0.04, 24]} /><meshStandardMaterial color={PADFACE} emissive={PADFACE} emissiveIntensity={0.2} /></mesh>
        </group>
        {/* Ápice / linha axilar média esquerda */}
        <group position={[1.0, -0.45, 0.6]}>
          <mesh><cylinderGeometry args={[0.28, 0.28, 0.16, 24]} /><meshStandardMaterial color={PAD} /></mesh>
          <mesh position={[0, 0, 0.09]}><cylinderGeometry args={[0.24, 0.24, 0.04, 24]} /><meshStandardMaterial color={PADFACE} emissive={PADFACE} emissiveIntensity={0.2} /></mesh>
        </group>
        <Html position={[-0.95, 1.05, 0.7]} center distanceFactor={11}><div style={lbl}>infraclavicular D</div></Html>
        <Html position={[1.0, -1.0, 0.6]} center distanceFactor={11}><div style={lbl}>ápice (axilar méd. E)</div></Html>
      </group>

      {(step === 1 || step === 4) && (
        <Html position={[0, 1.25, 0]} center distanceFactor={11}><div style={lbl}>5–6 cm · 100–120/min</div></Html>
      )}
    </group>
  );
}

const lbl = {
  background: "rgba(15,20,26,.85)", color: "#fff", fontSize: 11, fontWeight: 600,
  padding: "4px 8px", borderRadius: 6, fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap", pointerEvents: "none",
};
