import { useEffect } from "react";

// Mantém a tela ligada enquanto `active` for true (ex.: durante a gravação da
// anamnese ou o Modo Código). Reaquire o lock ao voltar o foco para a aba.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock = null;
    const acquire = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch {} };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (lock) lock.release().catch(() => {});
    };
  }, [active]);
}
