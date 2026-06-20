import { useState, useEffect } from "react";
import { P as BUNDLED } from "../data/protocols.js";
import { fetchRemoteProtocols, mergeProtocols } from "../data/remoteContent.js";

const CACHE_KEY = "acls.remoteProtocols";

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return Array.isArray(c?.items) && c.items.length ? c : null;
  } catch { return null; }
}

// Fonte de verdade dos protocolos:
//   1. embutido (instantâneo, sempre disponível, funciona offline)
//   2. cache do último conteúdo remoto válido (offline-first)
//   3. busca remota em segundo plano → valida → mescla → atualiza + cacheia
export default function useProtocols() {
  const cached = readCache();
  const [protocols, setProtocols] = useState(
    cached ? mergeProtocols(BUNDLED, cached.items) : BUNDLED
  );
  const [source, setSource] = useState(cached ? "cache" : "bundled");
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchRemoteProtocols(ctrl.signal)
      .then(({ items, fetchedAt }) => {
        if (!items.length) return;
        const prev = readCache();
        const changed = !prev || prev.fetchedAt !== fetchedAt;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ items, fetchedAt })); } catch { /* storage cheio/privativo */ }
        setProtocols(mergeProtocols(BUNDLED, items));
        setSource("remote");
        if (changed && prev) setUpdated(true);  // só avisa se já havia cache (atualização real)
      })
      .catch(() => { /* offline ou backend indisponível → mantém embutido/cache */ });
    return () => ctrl.abort();
  }, []);

  return { protocols, source, updated, dismissUpdated: () => setUpdated(false) };
}
