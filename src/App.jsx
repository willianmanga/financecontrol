import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import { captureOriginFromUrl, isLandingOrigin, getSelectedPlan, resolveCheckout, copyText } from './lib/checkout'

// Acesso direto / afiliado: ?origem=hotmart grava a origem e pula a landing page
const BOOT_FROM_HOTMART = captureOriginFromUrl()

function ResetPasswordPage({ onDone }) {
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
    if (error) { setError('Erro ao redefinir. Solicite um novo link.'); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
    setTimeout(async () => {
      await supabase.auth.signOut()
      onDone()
    }, 2500)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif", padding:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input:focus{border-color:rgba(99,102,241,0.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.12)!important;outline:none}`}</style>
      <div style={{ background:'rgba(10,14,26,0.97)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:20, padding:'38px', width:'100%', maxWidth:400, boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>Nova senha</div>
          <div style={{ fontSize:12, color:'#475569' }}>Digite sua nova senha abaixo</div>
        </div>

        {success ? (
          <div style={{ textAlign:'center', padding:'10px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#10b981', marginBottom:8 }}>Senha redefinida!</div>
            <div style={{ fontSize:12, color:'#475569' }}>Redirecionando para o login...</div>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, letterSpacing:'1.5px', color:'#475569', fontFamily:'monospace', display:'block', marginBottom:7 }}>NOVA SENHA</label>
              <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e=>setPassword(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'#e2e8f0', padding:'11px 14px', fontSize:13, fontFamily:'inherit' }} required />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:10, letterSpacing:'1.5px', color:'#475569', fontFamily:'monospace', display:'block', marginBottom:7 }}>CONFIRMAR SENHA</label>
              <input type="password" placeholder="Repita a senha" value={confirm} onChange={e=>setConfirm(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'#e2e8f0', padding:'11px 14px', fontSize:13, fontFamily:'inherit' }} required />
            </div>
            {error && (
              <div style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#fda4af', marginBottom:14 }}>⚠ {error}</div>
            )}
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:loading?'rgba(99,102,241,0.4)':'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', padding:'13px', fontWeight:800, fontSize:14, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }}>
              {loading?'Salvando...':'Redefinir senha →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function hasValidAccess(sub) {
  return !!sub && (sub.status === 'trial' || sub.status === 'active') && new Date(sub.expires_at) > new Date()
}

function PaywallPage({ user, subscription, onRefresh }) {
  const [checking, setChecking] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  // Origem 'landing' → Asaas (precisa do e-mail digitado manualmente). Demais casos → Hotmart.
  const fromLanding = isLandingOrigin()
  const preselected = getSelectedPlan() // 'monthly' | 'yearly' | null

  const handleCopy = async () => {
    const ok = await copyText(user.email || '')
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2500) }
  }

  const openCheckout = (plan) => {
    const { provider, url } = resolveCheckout(plan, user.email)
    if (!url) { setMsg('Link de pagamento não configurado.'); return }
    // window.open primeiro (ainda dentro do gesto do usuário) para o Safari/iOS não bloquear a nova aba
    window.open(url, '_blank', 'noopener,noreferrer')
    if (provider === 'asaas') handleCopy() // deixa o e-mail copiado para colar no checkout
  }

  const handleRefresh = async () => {
    setMsg(''); setChecking(true)
    const ok = await onRefresh()
    setChecking(false)
    if (!ok) setMsg('Pagamento ainda não identificado. Aguarde alguns instantes e tente de novo.')
  }

  const wasTrial = !subscription || subscription.plan_type === 'trial'
  const title = wasTrial ? 'Seu teste grátis terminou' : 'Sua assinatura não está ativa'
  const subtitle = wasTrial
    ? 'Escolha um plano para continuar controlando suas finanças com o Finly.'
    : 'Renove seu plano para voltar a acessar o Finly.'

  // Destaque: plano escolhido na landing; sem escolha, mantém o anual em destaque
  const highlight = preselected || 'yearly'
  const chosenOnLanding = fromLanding && !!preselected

  const planBtn = (isHighlight) => ({
    width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit', borderRadius:14, padding:'16px 18px', marginBottom:12, position:'relative',
    background: isHighlight ? 'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.16))' : 'rgba(255,255,255,0.04)',
    border: isHighlight ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)',
    color:'#e2e8f0', boxShadow: isHighlight ? '0 8px 28px rgba(99,102,241,0.25)' : 'none',
  })
  const flag = (text) => (
    <span style={{ position:'absolute', top:-9, right:14, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:9, fontWeight:800, letterSpacing:'1px', padding:'3px 10px', borderRadius:20, fontFamily:'monospace' }}>{text}</span>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif", padding:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} .plan-btn:hover{transform:translateY(-1px)}`}</style>
      <div style={{ background:'rgba(10,14,26,0.97)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:20, padding:'38px', width:'100%', maxWidth:440, boxShadow:'0 32px 80px rgba(0,0,0,0.5)', backdropFilter:'blur(20px)' }}>
        <div style={{ textAlign:'center', marginBottom:26 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>{title}</div>
          <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>{subtitle}</div>
        </div>

        {fromLanding && (
          <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:14, padding:'14px 16px', marginBottom:18 }}>
            <div style={{ fontSize:12, color:'#fcd34d', fontWeight:700, lineHeight:1.5, marginBottom:10 }}>
              ⚠ Use exatamente este e-mail no checkout do Asaas para liberar seu acesso automaticamente.
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, minWidth:0, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 12px', fontSize:12, color:'#e2e8f0', fontFamily:"'JetBrains Mono',monospace", wordBreak:'break-all' }}>
                {user.email}
              </div>
              <button onClick={handleCopy}
                style={{ flexShrink:0, background:copied?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.15)', border:copied?'1px solid rgba(16,185,129,0.5)':'1px solid rgba(245,158,11,0.45)', borderRadius:10, color:copied?'#6ee7b7':'#fcd34d', padding:'9px 12px', fontWeight:800, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                {copied ? '✓ Copiado' : 'Copiar e-mail'}
              </button>
            </div>
          </div>
        )}

        <button className="plan-btn" onClick={() => openCheckout('monthly')} style={planBtn(highlight === 'monthly')}>
          {highlight === 'monthly' && chosenOnLanding && flag('SUA ESCOLHA')}
          <div style={{ fontSize:11, letterSpacing:'1.5px', color:highlight === 'monthly' ? '#818cf8' : '#475569', fontFamily:'monospace', marginBottom:4 }}>PLANO MENSAL</div>
          <div style={{ fontSize:22, fontWeight:800 }}>R$ 19,90<span style={{ fontSize:12, fontWeight:600, color:'#64748b' }}> /mês</span></div>
        </button>

        <button className="plan-btn" onClick={() => openCheckout('yearly')} style={planBtn(highlight === 'yearly')}>
          {highlight === 'yearly' && flag(chosenOnLanding ? 'SUA ESCOLHA' : 'MAIS ESCOLHIDO')}
          <div style={{ fontSize:11, letterSpacing:'1.5px', color:highlight === 'yearly' ? '#818cf8' : '#475569', fontFamily:'monospace', marginBottom:4 }}>PLANO ANUAL</div>
          <div style={{ fontSize:22, fontWeight:800 }}>R$ 97,00<span style={{ fontSize:12, fontWeight:600, color:'#64748b' }}> /ano</span></div>
        </button>

        {msg && (
          <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#fcd34d', margin:'4px 0 12px' }}>⚠ {msg}</div>
        )}

        <button onClick={handleRefresh} disabled={checking}
          style={{ width:'100%', background:checking?'rgba(99,102,241,0.4)':'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:12, color:'#a5b4fc', padding:'12px', fontWeight:700, fontSize:13, cursor:checking?'not-allowed':'pointer', fontFamily:'inherit', marginTop:4 }}>
          {checking ? 'Verificando...' : 'Já paguei · Verificar acesso ↻'}
        </button>

        <button onClick={() => supabase.auth.signOut()}
          style={{ width:'100%', background:'transparent', border:'1px solid rgba(244,63,94,0.25)', borderRadius:12, color:'#f43f5e', padding:'10px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', marginTop:10 }}>
          Sair da conta
        </button>

        {!fromLanding && (
          <div style={{ textAlign:'center', fontSize:10, color:'#2d3f5a', fontFamily:'monospace', marginTop:16, wordBreak:'break-all' }}>{user.email}</div>
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
  const [sub, setSub] = useState(null)
  const [subLoading, setSubLoading] = useState(false)
  // null = mostra a landing page | 'login' | 'register' = mostra o AuthPage
  const [authMode, setAuthMode] = useState(BOOT_FROM_HOTMART ? 'login' : null)
  const [, setTick] = useState(0)
  // Ref espelha o estado para o listener onAuthStateChange (evita closure obsoleta)
  const isPasswordResetRef = useRef(false)
  const updatePasswordReset = (value) => {
    isPasswordResetRef.current = value
    setIsPasswordReset(value)
  }

  useEffect(() => {
    // Lê o hash ANTES de qualquer outra coisa
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const type = params.get('type')

    if (type === 'recovery') {
      updatePasswordReset(true)
      // Não limpa o hash ainda — o Supabase precisa do token para criar a sessão
    } else if (type === 'signup') {
      setEmailConfirmed(true)
      window.history.replaceState(null, '', window.location.pathname)
    }

    // Deixa o Supabase processar o token do hash automaticamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      // Agora pode limpar o hash
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        updatePasswordReset(true)
        setSession(session)
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        // Só redireciona pro dashboard se NÃO for reset de senha
        if (!isPasswordResetRef.current) {
          setEmailConfirmed(false)
          setSession(session)
        } else {
          setSession(session)
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        updatePasswordReset(false)
      } else {
        setSession(session)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Consulta a assinatura (por user_id; se não achar, por e-mail)
  const fetchSubscription = useCallback(async (user) => {
    if (!user) return null
    let { data } = await supabase.from('assinaturas').select('*').eq('user_id', user.id).maybeSingle()
    if (!data && user.email) {
      const res = await supabase.from('assinaturas').select('*').eq('email', user.email.toLowerCase()).order('id', { ascending: false }).limit(1).maybeSingle()
      data = res.data
    }
    return data || null
  }, [])

  const recheckSubscription = useCallback(async () => {
    const data = await fetchSubscription(session?.user)
    setSub(data)
    return hasValidAccess(data)
  }, [fetchSubscription, session?.user?.id])

  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) { setSub(null); setSubLoading(false); return }
    let cancelled = false
    setSubLoading(true)
    fetchSubscription(session.user).then((data) => {
      if (cancelled) return
      setSub(data)
      setSubLoading(false)
    })
    return () => { cancelled = true }
  }, [userId])

  // Re-renderiza a cada minuto para bloquear se o trial/plano vencer com o app aberto
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  if (loading || (session && subLoading)) {
    return (
      <div style={{ minHeight:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:16 }}>💰</div>
          <div style={{ width:28, height:28, border:'2px solid #1e293b', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  if (isPasswordReset && session) {
    return <ResetPasswordPage onDone={() => { setAuthMode('login'); updatePasswordReset(false) }} />
  }

  if (emailConfirmed && !session) {
    return (
      <div style={{ minHeight:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif" }}>
        <div style={{ background:'rgba(10,14,26,0.97)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:20, padding:'40px', textAlign:'center', maxWidth:380, boxShadow:'0 24px 80px rgba(16,185,129,0.1)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginBottom:8 }}>E-mail confirmado!</div>
          <div style={{ fontSize:13, color:'#475569', marginBottom:28, lineHeight:1.6 }}>Sua conta foi verificada. Agora é só fazer login!</div>
          <button onClick={() => { setAuthMode('login'); setEmailConfirmed(false) }}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', padding:'13px 28px', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }}>
            Fazer Login →
          </button>
        </div>
      </div>
    )
  }

  if (session && !isPasswordReset) {
    if (!hasValidAccess(sub)) {
      return <PaywallPage user={session.user} subscription={sub} onRefresh={recheckSubscription} />
    }
    return <Dashboard user={session.user} subscription={sub.status === 'trial' ? sub : null} />
  }

  if (authMode) {
    return <AuthPage key={authMode} initialMode={authMode} onBack={() => setAuthMode(null)} />
  }

  return <LandingPage onStart={(mode) => setAuthMode(mode)} />
}
