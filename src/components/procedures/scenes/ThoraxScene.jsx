import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", BONE = "#EDE6D6", DRAIN = "#0F766E";
const damp = THREE.MathUtils.damp;
const RIB_Y = [1.0, 0.4, -0.2, -0.8, -1.4];

// Drenagem torácica (parede do tórax, vista frontal esquemática).
export default function ThoraxScene({ step = 0 }) {
  const drain = useRef();
  const dab = useRef();

  // Triângulo de segurança (na lateral)
  const triGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.7, 1.0); s.lineTo(2.0, 0.6); s.lineTo(1.1, -0.9); s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  // Sítio de punção: espaço intercostal logo ACIMA da costela inferior (y=-0.2)
  const siteY = -0.03, siteX = 1.35;
  const target = [2.0, 2.0, 0.45, -0.1, -0.65][step] ?? 2.0; // avanço em Z (de fora para dentro)

  useFrame((_, dt) => {
    if (drain.current) drain.current.position.z = damp(drain.current.position.z, target, 4, dt);
    if (dab.current) dab.current.visible = step === 1;
  });

  return (
    <group position={[-0.4, 0.1, 0]}>
      {/* Costelas + feixe neurovascular na BORDA INFERIOR de cada costela */}
      {RIB_Y.map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 4, 20]} />
            <meshStandardMaterial color={BONE} roughness={0.7} />
          </mesh>
          <mesh position={[0, y - 0.17, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 4, 12]} />
            <meshStandardMaterial color="#C0392B" emissive="#C0392B" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Pleura (plano interno) */}
      <mesh position={[0, -0.2, -0.35]}>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial color="#8FB6D9" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Pele translúcida na frente */}
      <mesh position={[0, -0.2, 0.5]}>
        <planeGeometry args={[4.2, 3.2]} />
        <meshStandardMaterial color={SKIN} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* Triângulo de segurança (destaca no passo 0) */}
      <mesh geometry={triGeo} position={[0, -0.2, 0.53]}>
        <meshStandardMaterial color="#F6C453" transparent opacity={step === 0 ? 0.55 : 0.16}
          emissive="#F6C453" emissiveIntensity={step === 0 ? 0.5 : 0} side={THREE.DoubleSide} />
      </mesh>
      {step === 0 && (
        <Html position={[1.5, 1.2, 0.5]} center distanceFactor={10}><div style={lbl}>triângulo de segurança</div></Html>
      )}
      {(step === 2 || step === 3) && (
        <Html position={[siteX - 1.4, siteY, 0.6]} center distanceFactor={9}><div style={lbl}>borda SUPERIOR da costela</div></Html>
      )}

      {/* Botão anestésico (passo 1) */}
      <mesh ref={dab} position={[siteX, siteY, 0.55]} visible={false}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#EAF2FB" transparent opacity={0.85} />
      </mesh>

      {/* Dreno — entra angulado, rente à borda superior da costela inferior */}
      <group ref={drain} position={[siteX, siteY + 0.18, 2]} rotation={[0.5, 0, -0.15]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.09, 1.6, 16]} />
          <meshStandardMaterial color={DRAIN} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.85, 0]}>
          <coneGeometry args={[0.09, 0.2, 16]} />
          <meshStandardMaterial color={DRAIN} roughness={0.5} />
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
