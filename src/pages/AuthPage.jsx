import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'Senha deve ter pelo menos 6 caracteres.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
      }
      setError(msgs[err.message] || err.message)
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'DM Sans', sans-serif", padding: 20, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        *{box-sizing:border-box}
        input:focus{border-color:rgba(99,102,241,0.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.12)!important;outline:none}
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ background: 'rgba(10,14,26,0.97)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 22, padding: '38px 38px 34px', width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)', position: 'relative', backdropFilter: 'blur(20px)' }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.8),transparent)', borderRadius: 1 }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', animation: 'float 4s ease-in-out infinite' }}>💰</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#e2e8f0', marginBottom: 4 }}>FinanceControl</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>CONTROLE FINANCEIRO PESSOAL</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          {[['login', 'Entrar'], ['register', 'Criar conta']].map(([k, lb]) => (
            <button key={k} onClick={() => { setMode(k); setError(''); setSuccess('') }}
              style={{ flex: 1, padding: '9px', border: 'none', cursor: 'pointer', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all .2s', background: mode === k ? 'rgba(99,102,241,0.55)' : 'transparent', color: mode === k ? '#fff' : '#475569', boxShadow: mode === k ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
              {lb}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, letterSpacing: '1.5px', color: '#475569', fontFamily: 'monospace', display: 'block', marginBottom: 7 }}>NOME</label>
              <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', padding: '11px 14px', fontSize: 13, fontFamily: 'inherit', transition: 'all .2s' }}
                type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, letterSpacing: '1.5px', color: '#475569', fontFamily: 'monospace', display: 'block', marginBottom: 7 }}>E-MAIL</label>
            <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', padding: '11px 14px', fontSize: 13, fontFamily: 'inherit', transition: 'all .2s' }}
              type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 10, letterSpacing: '1.5px', color: '#475569', fontFamily: 'monospace', display: 'block', marginBottom: 7 }}>SENHA</label>
            <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', padding: '11px 14px', fontSize: 13, fontFamily: 'inherit', transition: 'all .2s' }}
              type="password" placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fda4af', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', flexShrink: 0 }} />
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#6ee7b7', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              {success}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', padding: '13px', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', boxShadow: loading ? 'none' : '0 6px 20px rgba(99,102,241,0.35)', letterSpacing: '0.3px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Aguarde...
              </div>
            ) : mode === 'login' ? 'Entrar →' : 'Criar conta →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 11, color: '#2d3f5a', fontFamily: 'monospace' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <button onClick={handleGoogle}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', padding: '11px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8L6 32.6C9.4 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C41.4 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Entrar com Google
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#1e293b', fontFamily: 'monospace' }}>
          🔒 Seus dados são privados · cada usuário vê apenas as suas despesas
        </div>
      </div>
    </div>
  )
}
