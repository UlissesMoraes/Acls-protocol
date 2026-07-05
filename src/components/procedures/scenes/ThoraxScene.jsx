import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", BONE = "#EDE6D6", DRAIN = "#0F766E", LUNG = "#D98D8D";
const damp = THREE.MathUtils.damp;
const RIB_Y = [1.25, 0.7, 0.15, -0.4, -0.95, -1.5];
const R = 2.6, ARC = 1.35, CZ = -2.2; // raio do gradil, abertura do arco, centro em Z

// Drenagem torácica — parede curva do tórax com costelas em arco, pulmão
// colabado (pneumotórax) que reexpande ao final da drenagem.
export default function ThoraxScene({ step = 0 }) {
  const drain = useRef();
  const dab = useRef();
  const lung = useRef();
  const air = useRef();

  // Triângulo de segurança sobre a parede
  const triGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.7, 1.0); s.lineTo(2.0, 0.6); s.lineTo(1.1, -0.9); s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  const siteY = -0.03, siteX = 1.35;
  const target = [2.0, 2.0, 0.45, -0.1, -0.65][step] ?? 2.0;

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    if (drain.current) drain.current.position.z = damp(drain.current.position.z, target, 4, dt);
    if (dab.current) dab.current.visible = step === 1;
    // Pulmão: colabado (0.55) → reexpande no último passo, com respiração sutil
    if (lung.current) {
      const base = step >= 4 ? 1 : 0.55;
      const breath = step >= 4 ? 1 + 0.035 * Math.sin(t * 1.6) : 1;
      const s = damp(lung.current.scale.x, base * breath, 1.8, dt);
      lung.current.scale.set(s, s, s);
    }
    // Camada de ar do pneumotórax some ao drenar
    if (air.current) {
      const op = step >= 4 ? 0 : 0.20;
      air.current.material.opacity = damp(air.current.material.opacity, op, 1.5, dt);
    }
  });

  return (
    <group position={[-0.4, 0.1, 0]}>
      {/* ── Gradil costal curvo: costelas em arco + feixe na borda INFERIOR ── */}
      {RIB_Y.map((y, i) => (
        <group key={i} position={[0, y, CZ]} rotation={[0, Math.PI / 2 - ARC / 2, -0.07]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[R, 0.13, 12, 40, ARC]} />
            <meshStandardMaterial color={BONE} roughness={0.65} />
          </mesh>
          {/* Feixe neurovascular (vermelho) rente à borda inferior da costela */}
          <mesh position={[0, -0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[R + 0.01, 0.045, 8, 36, ARC]} />
            <meshStandardMaterial color="#C0392B" emissive="#C0392B" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* ── Pulmão (colaba/reexpande) ── */}
      <mesh ref={lung} position={[0.25, -0.25, -1.1]} scale={0.55}>
        <sphereGeometry args={[1.15, 28, 24]} />
        <meshStandardMaterial color={LUNG} roughness={0.8} transparent opacity={0.92} />
      </mesh>
      {/* Ar do pneumotórax (entre pulmão e parede) */}
      <mesh ref={air} position={[0.2, -0.2, -0.9]}>
        <sphereGeometry args={[1.65, 24, 20]} />
        <meshStandardMaterial color="#2C3E50" transparent opacity={0.20} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {step < 4 && (
        <Html position={[-1.6, -1.3, 0]} center distanceFactor={10}><div style={lbl}>pulmão colabado (pneumotórax)</div></Html>
      )}
      {step >= 4 && (
        <Html position={[-1.6, -1.3, 0]} center distanceFactor={10}><div style={{ ...lbl, background: "rgba(15,118,110,.9)" }}>pulmão reexpandindo ✓</div></Html>
      )}

      {/* Pleura parietal (véu interno) */}
      <mesh position={[0, -0.2, -0.35]}>
        <planeGeometry args={[4, 3.4]} />
        <meshStandardMaterial color="#8FB6D9" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Pele curva (segmento de cilindro na frente do gradil) */}
      <mesh position={[0, -0.15, CZ]} rotation={[0, Math.PI / 2 - (ARC + 0.15) / 2, 0]}>
        <cylinderGeometry args={[R + 0.35, R + 0.35, 3.6, 40, 1, true, 0, ARC + 0.15]} />
        <meshStandardMaterial color={SKIN} transparent opacity={0.26} roughness={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Triângulo de segurança (destaca no passo 0) */}
      <mesh geometry={triGeo} position={[0, -0.2, 0.55]}>
        <meshStandardMaterial color="#F6C453" transparent opacity={step === 0 ? 0.55 : 0.15}
          emissive="#F6C453" emissiveIntensity={step === 0 ? 0.5 : 0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {step === 0 && (
        <Html position={[1.5, 1.25, 0.5]} center distanceFactor={10}><div style={lbl}>triângulo de segurança</div></Html>
      )}
      {(step === 2 || step === 3) && (
        <Html position={[siteX - 1.5, siteY, 0.6]} center distanceFactor={9}><div style={lbl}>borda SUPERIOR da costela</div></Html>
      )}

      {/* Botão anestésico (passo 1) */}
      <mesh ref={dab} position={[siteX, siteY, 0.62]} visible={false}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#EAF2FB" transparent opacity={0.85} />
      </mesh>

      {/* Dreno — entra angulado, rente à borda superior da costela inferior */}
      <group ref={drain} position={[siteX, siteY + 0.18, 2]} rotation={[0.5, 0, -0.15]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.09, 1.7, 16]} />
          <meshStandardMaterial color={DRAIN} roughness={0.45} />
        </mesh>
        <mesh position={[0, -0.9, 0]}>
          <coneGeometry args={[0.09, 0.2, 16]} />
          <meshStandardMaterial color={DRAIN} roughness={0.45} />
        </mesh>
        {/* Fenestras do dreno */}
        {[-0.55, -0.7].map((y, i) => (
          <mesh key={i} position={[0.08, y, 0]}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color="#0B4F49" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const lbl = {
  background: "rgba(15,20,26,.85)", color: "#fff", fontSize: 11, fontWeight: 600,
  padding: "4px 8px", borderRadius: 6, fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap", pointerEvents: "none",
};
