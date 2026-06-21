import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", BONE = "#EDE6D6", STEEL = "#9AA6B2", HUB = "#2B6CB0";
const damp = THREE.MathUtils.damp;

// Acesso intraósseo na tíbia proximal (esquemático).
export default function IOScene({ step = 0 }) {
  const needle = useRef();   // grupo da agulha (origem = ponta)
  const mandril = useRef();  // estilete que sai no passo 3
  const fluid = useRef();    // bolha de infusão (passo 4)
  const swab = useRef();     // algodão da antissepsia (passo 1)

  useFrame((_, dt) => {
    const tipY = step >= 2 ? 0.08 : 1.7;          // desce e crava no osso a partir do passo 2
    if (needle.current) needle.current.position.y = damp(needle.current.position.y, tipY, 5, dt);
    const mOut = step >= 3 ? 0.9 : 0;             // estilete sai
    if (mandril.current) mandril.current.position.y = damp(mandril.current.position.y, mOut, 6, dt);
    const fl = step >= 4 ? 1 : 0.001;             // infusão pulsa
    if (fluid.current) {
      const s = fl * (1 + 0.25 * Math.sin(performance.now() / 200));
      fluid.current.scale.setScalar(damp(fluid.current.scale.x, s, 6, dt));
    }
    if (swab.current) swab.current.visible = step === 1;
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* Tíbia (cilindro deitado no eixo X) + joelho */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 5, 32]} />
        <meshStandardMaterial color={BONE} roughness={0.7} />
      </mesh>
      <mesh position={[-2.5, 0, 0]}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial color={BONE} roughness={0.7} />
      </mesh>
      {/* Tuberosidade tibial (referência) */}
      <mesh position={[-1.8, 0.45, 0.15]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color={BONE} roughness={0.7} />
      </mesh>
      {/* Pele translúcida por cima do osso */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.64, 0.64, 4.6, 32, 1, true]} />
        <meshStandardMaterial color={SKIN} transparent opacity={0.32} roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Ponto de punção (anel destacado no passo 0) */}
      <mesh position={[-1.2, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.04, 12, 24]} />
        <meshStandardMaterial color={step === 0 ? "#F6C453" : "#C0392B"} emissive={step === 0 ? "#F6C453" : "#000"} emissiveIntensity={step === 0 ? 0.6 : 0} />
      </mesh>
      {step === 0 && (
        <Html position={[-1.2, 1.2, 0]} center distanceFactor={9}>
          <div style={lbl}>2 cm abaixo e 1–2 cm medial à tuberosidade</div>
        </Html>
      )}

      {/* Algodão da antissepsia */}
      <mesh ref={swab} position={[-1.2, 0.75, 0]} visible={false}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#EAF2FB" roughness={1} />
      </mesh>

      {/* Agulha IO — origem no eixo = ponta, corpo para cima */}
      <group ref={needle} position={[-1.2, 1.7, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.05, 0.02, 1.2, 16]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.28, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.28, 24]} />
          <meshStandardMaterial color={HUB} roughness={0.5} />
        </mesh>
        {/* Estilete (sai no passo 3) */}
        <mesh ref={mandril} position={[0, 0, 0]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 12]} />
            <meshStandardMaterial color="#5B6770" metalness={0.5} />
          </mesh>
        </mesh>
      </group>

      {/* Bolha de infusão dentro do osso */}
      <mesh ref={fluid} position={[-1.2, 0.05, 0]} scale={0.001}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color="#48BB78" transparent opacity={0.7} emissive="#48BB78" emissiveIntensity={0.3} />
      </mesh>

      <Html position={[1.7, -0.7, 0]} center distanceFactor={10}>
        <div style={{ ...lbl, opacity: 0.85 }}>Tíbia</div>
      </Html>
    </group>
  );
}

const lbl = {
  background: "rgba(15,20,26,.85)", color: "#fff", fontSize: 11, fontWeight: 600,
  padding: "4px 8px", borderRadius: 6, fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap", pointerEvents: "none", transform: "translateY(-6px)",
};
