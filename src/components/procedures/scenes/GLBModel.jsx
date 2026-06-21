import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

// Carrega um GLB e o normaliza: centraliza na origem e escala para `height`.
// Assim qualquer modelo (independente da escala/origem nativas) encaixa na cena.
export default function GLBModel({ url, height = 2, position = [0, 0, 0], rotation = [0, 0, 0], castShadow = true }) {
  const { scene } = useGLTF(url);

  const { obj, scale } = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    c.position.sub(center); // centraliza
    c.traverse(o => { if (o.isMesh) { o.castShadow = castShadow; o.receiveShadow = false; if (o.material) o.material.envMapIntensity = 0.8; } });
    return { obj: c, scale: height / (size.y || 1) };
  }, [scene, height, castShadow]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={obj} />
    </group>
  );
}
