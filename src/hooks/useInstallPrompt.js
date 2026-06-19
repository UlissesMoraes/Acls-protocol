import { useState, useEffect } from "react";

// Gerencia a instalação do PWA (Android/desktop via beforeinstallprompt) e
// detecta iOS/standalone para oferecer a instrução adequada.
export default function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return null;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice?.outcome;
  };

  return {
    canInstall: !!deferred,        // Android/desktop: prompt nativo disponível
    promptInstall,
    installed,
    isIOS: isIOS && !isStandalone, // iOS precisa de instrução manual
    isStandalone,
  };
}
