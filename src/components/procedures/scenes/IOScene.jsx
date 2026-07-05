import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const SKIN = "#E8B98E", BONE = "#EDE6D6", STEEL = "#B7C2CC", HUB = "#2B6CB0";
const damp = THREE.MathUtils.damp;

// Perfil anatômico da tíbia (raio × comprimento) — planalto alargado, diáfise
// afilada e maléolo distal. Revolucionada (lathe) e deitada ao longo do eixo X.
function tibiaGeo() {
  const pts = [
    [0.72, 0.0], [0.70, -0.25], [0.55, -0.6], [0.42, -1.1], [0.36, -1.8],
    [0.34, -2.5], [0.36, -3.1], [0.42, -3.55], [0.52, -3.85], [0.46, -4.1],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 36);
}
// Envelope de pele/partes moles sobre a perna.
function skinGeo() {
  const pts = [
    [0.95, 0.35], [0.98, -0.1], [0.92, -0.7], [0.85, -1.3], [0.76, -2.0],
    [0.68, -2.7], [0.62, -3.3], [0.60, -3.9], [0.58, -4.25],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 36);
}

// Acesso intraósseo na tíbia proximal — perna anatômica procedural.
export default function IOScene({ step = 0 }) {
  const needle = useRef();
  const spin = useRef();
  const mandril = useRef();
  const fluid = useRef();
  const swab = useRef();
  const ring = useRef();

  const tibia = useMemo(tibiaGeo, []);
  const skin = useMemo(skinGeo, []);

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const tipY = step >= 2 ? 0.18 : 1.7;
    if (needle.current) {
      needle.current.position.y = damp(needle.current.position.y, tipY, 5, dt);
      // Broca gira enquanto desce (passo 2)
      const descending = step === 2 && needle.current.position.y > 0.3;
      if (spin.current) spin.current.rotation.y += (descending ? 18 : 0) * dt;
    }
    const mOut = step >= 3 ? 0.9 : 0;
    if (mandril.current) mandril.current.position.y = damp(mandril.current.position.y, mOut, 6, dt);
    if (fluid.current) {
      const on = step >= 4;
      const s = on ? 1 + 0.18 * Math.sin(t * 5) : 0.001;
      fluid.current.scale.x = damp(fluid.current.scale.x, on ? 1.6 * s : 0.001, 6, dt);
      fluid.current.scale.y = fluid.current.scale.z = damp(fluid.current.scale.y, on ? 0.75 * s : 0.001, 6, dt);
    }
    if (swab.current) {
      swab.current.visible = step === 1;
      if (step === 1) swab.current.position.z = 0.25 * Math.sin(t * 3); // fricção
    }
    if (ring.current) {
      const p = step === 0 ? 1 + 0.15 * Math.sin(t * 4) : 1;
      ring.current.scale.setScalar(p);
    }
  });

  return (
    <group position={[0.4, -0.1, 0]}>
      {/* ── Joelho: côndilos femorais + patela ── */}
      <group position={[-2.75, 0.25, 0]}>
        <mesh position={[0, 0, 0.3]}><sphereGeometry args={[0.52, 28, 24]} /><meshStandardMaterial color={BONE} roughness={0.65} /></mesh>
        <mesh position={[0, 0, -0.3]}><sphereGeometry args={[0.52, 28, 24]} /><meshStandardMaterial color={BONE} roughness={0.65} /></mesh>
        {/* Fêmur distal subindo */}
        <mesh position={[-0.55, 0.5, 0]} rotation={[0, 0, -0.9]}>
          <cylinderGeometry args={[0.34, 0.42, 1.6, 24]} /><meshStandardMaterial color={BONE} roughness={0.65} />
        </mesh>
        {/* Patela */}
        <mesh position={[0.28, 0.52, 0]} scale={[0.8, 1, 0.9]}>
          <sphereGeometry args={[0.3, 24, 20]} /><meshStandardMaterial color={BONE} roughness={0.6} />
        </mesh>
      </group>

      {/* ── Tíbia anatômica (lathe deitada: proximal à esquerda) ── */}
      <group position={[-2.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh geometry={tibia}><meshStandardMaterial color={BONE} roughness={0.62} /></mesh>
      </group>
      {/* Tuberosidade tibial (relevo anterior) */}
      <mesh position={[-1.75, 0.5, 0]} scale={[1.4, 0.55, 0.8]}>
        <sphereGeometry args={[0.24, 20, 16]} /><meshStandardMaterial color={BONE} roughness={0.62} />
      </mesh>
      {/* Fíbula (posterolateral, mais fina) */}
      <group position={[-2.05, -0.18, -0.52]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[0, -1.8, 0]}><cylinderGeometry args={[0.11, 0.13, 3.4, 16]} /><meshStandardMaterial color={BONE} roughness={0.7} /></mesh>
        <mesh><sphereGeometry args={[0.17, 16, 14]} /><meshStandardMaterial color={BONE} roughness={0.7} /></mesh>
      </group>

      {/* ── Panturrilha (gastrocnêmio) sob a pele ── */}
      <mesh position={[-0.9, -0.5, 0]} scale={[1.5, 0.55, 0.7]}>
        <sphereGeometry args={[0.85, 24, 20]} /><meshStandardMaterial color="#D89B77" roughness={0.9} transparent opacity={0.5} />
      </mesh>

      {/* ── Pele translúcida (envelope da perna) ── */}
      <group position={[-2.35, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh geometry={skin}><meshStandardMaterial color={SKIN} transparent opacity={0.30} roughness={1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      </group>
      {/* Pé (indicação) */}
      <mesh position={[2.25, -0.15, 0]} rotation={[0, 0, 0.25]} scale={[1, 0.5, 0.62]}>
        <sphereGeometry args={[0.55, 20, 16]} /><meshStandardMaterial color={SKIN} transparent opacity={0.45} roughness={1} />
      </mesh>

      {/* ── Sítio de punção (anel pulsante no passo 0) ── */}
      <mesh ref={ring} position={[-1.35, 0.56, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.045, 12, 26]} />
        <meshStandardMaterial color={step === 0 ? "#F6C453" : "#C0392B"} emissive={step === 0 ? "#F6C453" : "#C0392B"} emissiveIntensity={step === 0 ? 0.7 : 0.2} />
      </mesh>
      {step === 0 && (
        <Html position={[-1.35, 1.35, 0]} center distanceFactor={9}>
          <div style={lbl}>2 cm abaixo e 1–2 cm medial à tuberosidade</div>
        </Html>
      )}

      {/* Algodão da antissepsia (fricciona no passo 1) */}
      <mesh ref={swab} position={[-1.35, 0.8, 0]} visible={false}>
        <sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#EAF2FB" roughness={1} />
      </mesh>

      {/* ── Agulha IO com broca giratória ── */}
      <group ref={needle} position={[-1.35, 1.7, 0.18]}>
        <group ref={spin}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.05, 0.015, 1.1, 16]} />
            <meshStandardMaterial color={STEEL} metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Corpo do driver */}
          <mesh position={[0, 1.28, 0]}>
            <cylinderGeometry args={[0.22, 0.18, 0.42, 24]} />
            <meshStandardMaterial color={HUB} roughness={0.45} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.2, 20, 16]} /><meshStandardMaterial color="#1E4E79" roughness={0.5} />
          </mesh>
        </group>
        {/* Estilete (sai no passo 3) */}
        <group ref={mandril}>
          <mesh position={[0, 1.85, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.55, 12]} />
            <meshStandardMaterial color="#5B6770" metalness={0.5} />
          </mesh>
        </group>
      </group>

      {/* ── Infusão no canal medular (elipsoide ao longo do osso) ── */}
      <mesh ref={fluid} position={[-1.35, 0.1, 0]} scale={0.001}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshStandardMaterial color="#48BB78" transparent opacity={0.75} emissive="#48BB78" emissiveIntensity={0.35} />
      </mesh>

      <Html position={[0.4, -1.15, 0]} center distanceFactor={10}><div style={{ ...lbl, opacity: 0.85 }}>tíbia</div></Html>
      <Html position={[-2.75, 1.35, 0]} center distanceFactor={10}><div style={{ ...lbl, opacity: 0.85 }}>joelho</div></Html>
    </group>
  );
}

const lbl = {
  background: "rgba(15,20,26,.85)", color: "#fff", fontSize: 11, fontWeight: 600,
  padding: "4px 8px", borderRadius: 6, fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap", pointerEvents: "none", transform: "translateY(-6px)",
};
