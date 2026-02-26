import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

// Tela de redefinir senha
function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('Erro ao redefinir senha. Tente solicitar um novo link.'); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
    // Desloga e redireciona pro login após 2s
    setTimeout(async () => { await supabase.auth.signOut() }, 2000)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#070b14', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", padding:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input:focus{border-color:rgba(99,102,241,0.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.12)!important;outline:none}`}</style>
      <div style={{ background:'rgba(10,14,26,0.97)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'38px', width:'100%', maxWidth:400, boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔐</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>Nova senha</div>
          <div style={{ fontSize:12, color:'#475569' }}>Digite sua nova senha abaixo</div>
        </div>

        {success ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#10b981', marginBottom:8 }}>Senha redefinida!</div>
            <div style={{ fontSize:12, color:'#475569' }}>Redirecionando para o login...</div>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, letterSpacing:'1.5px', color:'#475569', fontFamily:'monospace', display:'block', marginBottom:7 }}>NOVA SENHA</label>
              <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e=>setPassword(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'#e2e8f0', padding:'11px 14px', fontSize:13, fontFamily:'inherit', transition:'all .2s' }} required />
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:10, letterSpacing:'1.5px', color:'#475569', fontFamily:'monospace', display:'block', marginBottom:7 }}>CONFIRMAR SENHA</label>
              <input type="password" placeholder="Repita a senha" value={confirm} onChange={e=>setConfirm(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'#e2e8f0', padding:'11px 14px', fontSize:13, fontFamily:'inherit', transition:'all .2s' }} required />
            </div>
            {error && (
              <div style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#fda4af', marginBottom:14 }}>
                ⚠ {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:loading?'rgba(99,102,241,0.4)':'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', padding:'13px', fontWeight:800, fontSize:14, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', boxShadow:loading?'none':'0 6px 20px rgba(99,102,241,0.35)' }}>
              {loading ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
                  Salvando...
                </div>
              ) : 'Redefinir senha →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)

  useEffect(() => {
    const hash = window.location.hash

    // Detecta link de redefinição de senha
    if (hash.includes('type=recovery')) {
      setIsPasswordReset(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
    // Detecta confirmação de e-mail de cadastro
    else if (hash.includes('type=signup')) {
      setEmailConfirmed(true)
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true)
        setSession(session)
      } else if (event === 'SIGNED_IN') {
        setEmailConfirmed(false)
        setSession(session)
      } else {
        setSession(session)
        // Ao deslogar após reset, volta pro login
        if (event === 'SIGNED_OUT') {
          setIsPasswordReset(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#070b14', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:16 }}>💰</div>
          <div style={{ width:28, height:28, border:'2px solid #1e293b', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  // Tela de redefinir senha
  if (isPasswordReset && session) {
    return <ResetPasswordPage />
  }

  // Tela de e-mail confirmado
  if (emailConfirmed && !session) {
    return (
      <div style={{ minHeight:'100vh', background:'#070b14', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif" }}>
        <div style={{ background:'rgba(10,14,26,0.97)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:20, padding:'40px', textAlign:'center', maxWidth:380, boxShadow:'0 24px 80px rgba(16,185,129,0.1)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginBottom:8 }}>E-mail confirmado!</div>
          <div style={{ fontSize:13, color:'#475569', marginBottom:28, lineHeight:1.6 }}>Sua conta foi verificada. Agora é só fazer login!</div>
          <button onClick={() => setEmailConfirmed(false)}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', padding:'13px 28px', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }}>
            Fazer Login →
          </button>
        </div>
      </div>
    )
  }

  return session ? <Dashboard user={session.user} /> : <AuthPage />
}
