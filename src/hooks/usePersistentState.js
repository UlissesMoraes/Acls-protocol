import { useState, useEffect } from "react";

// Estado que sobrevive a refresh/fechamento via localStorage.
// Tolerante a ambientes sem storage (modo privativo, SSR).
export default function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage indisponível — degrada para estado em memória */
    }
  }, [key, value]);

  return [value, setValue];
}
