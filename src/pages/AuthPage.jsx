import { useState } from 'react'
import { supabase } from '../lib/supabase'

const S = {
  wrap: {
    minHeight: '100vh', background: '#06080f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif", padding: 20,
  },
  card: {
    background: 'rgba(13,17,30,0.98)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: 20, padding: '40px 40px 36px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 24px 80px rgba(99,102,241,0.12)',
  },
  logo: { fontSize: 32, marginBottom: 12, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 12, color: '#3a4a68', textAlign: 'center', fontFamily: 'DM Mono, monospace', marginBottom: 30 },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab: (a) => ({
    flex: 1, padding: '8px', border: 'none', cursor: 'pointer', borderRadius: 7,
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, transition: 'all .2s',
    background: a ? 'rgba(99,102,241,0.5)' : 'transparent',
    color: a ? '#fff' : '#3a4a68',
  }),
  label: { fontSize: 10, letterSpacing: '1.5px', color: '#3a4a68', fontFamily: 'DM Mono, monospace', display: 'block', marginBottom: 6 },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9,
    color: '#e8eaf0', padding: '11px 14px', fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
    marginBottom: 14, transition: 'border-color .2s',
  },
  btn: (loading) => ({
    width: '100%', background: loading ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.85)',
    border: 'none', borderRadius: 10, color: '#fff',
    padding: '13px', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: "'DM Sans', sans-serif", marginTop: 6, transition: 'all .2s',
  }),
  err: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#fca5a5', marginBottom: 14,
  },
  ok: {
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#86efac', marginBottom: 14,
  },
  divider: { textAlign: 'center', fontSize: 11, color: '#1e2a42', margin: '20px 0 16px', fontFamily: 'DM Mono, monospace' },
  googleBtn: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e8eaf0',
    padding: '11px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 10, transition: 'all .2s',
  },
}

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
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
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logo}>💰</div>
        <div style={S.title}>FinanceControl</div>
        <div style={S.sub}>Controle financeiro pessoal · Supabase</div>

        <div style={S.tabs}>
          <button style={S.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>
            Entrar
          </button>
          <button style={S.tab(mode === 'register')} onClick={() => { setMode('register'); setError(''); setSuccess('') }}>
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div>
              <label style={S.label}>NOME</label>
              <input style={S.input} type="text" placeholder="Seu nome" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label style={S.label}>E-MAIL</label>
            <input style={S.input} type="email" placeholder="seu@email.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={S.label}>SENHA</label>
            <input style={S.input} type="password" placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <div style={S.err}>⚠ {error}</div>}
          {success && <div style={S.ok}>✓ {success}</div>}

          <button type="submit" style={S.btn(loading)} disabled={loading}>
            {loading ? '⟳ Aguarde...' : mode === 'login' ? 'Entrar →' : 'Criar conta →'}
          </button>
        </form>

        <div style={S.divider}>— ou continue com —</div>
        <button style={S.googleBtn} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8L6 32.6C9.4 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C41.4 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Entrar com Google
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#1e2a42', fontFamily: 'DM Mono, monospace' }}>
          Seus dados são privados · cada usuário vê apenas as suas despesas
        </div>
      </div>
    </div>
  )
}
