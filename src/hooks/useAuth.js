import { useState, useEffect } from "react";
import { supabase, AUTH_ENABLED } from "../lib/supabase.js";

// Acompanha a sessão do usuário. `session === undefined` = carregando;
// `null` = deslogado; objeto = logado. `recovery` indica fluxo de redefinição
// de senha (link do email) — nesse caso mostramos o formulário de nova senha.
export function useAuth() {
  const [session, setSession] = useState(AUTH_ENABLED ? undefined : null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session ?? null); })
      .catch(() => { if (active) setSession(null); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, recovery, clearRecovery: () => setRecovery(false) };
}
