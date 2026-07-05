import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import { useAuth } from './hooks/useAuth.js'
import { AUTH_ENABLED } from './lib/supabase.js'

function AuthSplash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg,#f4f6f9)' }}>
      <div style={{ width: 30, height: 30, border: '3px solid #cbd5e0', borderTopColor: '#2B6CB0', borderRadius: '50%', animation: 'authSpin 1s linear infinite' }} />
      <style>{`@keyframes authSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Root() {
  const { session, recovery, clearRecovery } = useAuth()
  if (!AUTH_ENABLED) return <App />
  if (recovery) return <AuthScreen mode="recover" onDone={clearRecovery} />
  if (session === undefined) return <AuthSplash />
  if (!session) return <AuthScreen />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)

// Registro do service worker para uso offline (produção) + detecção de atualização
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          // Nova versão instalada com uma já controlando a página = atualização disponível
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw-update'))
          }
        })
      })
    }).catch(() => { /* SW indisponível — app segue online */ })

    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  })
}
