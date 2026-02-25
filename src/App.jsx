import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailConfirmed, setEmailConfirmed] = useState(false)

  useEffect(() => {
    // Verifica se é confirmação de e-mail (type=signup) mas NÃO login do Google
    const hash = window.location.hash
    const isEmailConfirm = hash.includes('type=signup')
    const isGoogleLogin = hash.includes('type=recovery') || 
                          (hash.includes('access_token') && !hash.includes('type=signup'))

    if (isEmailConfirm) {
      setEmailConfirmed(true)
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_IN via Google — vai direto pro dashboard
      if (event === 'SIGNED_IN') {
        setEmailConfirmed(false) // garante que não trava na tela de confirmação
        setSession(session)
      } else {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>💰</div>
          <div style={{ width: 28, height: 28, border: '2px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  // Só mostra tela de confirmação se for e-mail E não tiver sessão ativa
  if (emailConfirmed && !session) {
    return (
      <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ background: 'rgba(10,14,26,0.97)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '40px', textAlign: 'center', maxWidth: 380, boxShadow: '0 24px 80px rgba(16,185,129,0.1)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>E-mail confirmado!</div>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 28, lineHeight: 1.6 }}>Sua conta foi verificada. Agora é só fazer login!</div>
          <button onClick={() => setEmailConfirmed(false)}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', padding: '13px 28px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
            Fazer Login →
          </button>
        </div>
      </div>
    )
  }

  return session ? <Dashboard user={session.user} /> : <AuthPage />
}
