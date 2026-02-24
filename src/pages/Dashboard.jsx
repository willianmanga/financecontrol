import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from 'recharts'

const CAT_COLORS = {
  'Cartão': '#EF4444', 'Banco': '#3B82F6', 'Serviços': '#8B5CF6',
  'Moradia': '#F59E0B', 'Transporte': '#10B981', 'Mercado': '#F97316', 'Outros': '#6B7280',
}
const CATS = Object.keys(CAT_COLORS)
const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK = v => 'R$' + (v / 1000).toFixed(1).replace('.', ',') + 'k'
const curMonth = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
const monthLabel = (m) => { if (!m) return ''; const [mo, yr] = m.split('/'); const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${names[parseInt(mo) - 1]}/${yr.slice(2)}` }

// ── COMPONENTES ────────────────────────────────────────────
function Ring({ pct, size = 90, stroke = 9, color = '#22c55e' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [off, setOff] = useState(circ)
  useEffect(() => { const t = setTimeout(() => setOff(circ - (pct / 100) * circ), 80); return () => clearTimeout(t) }, [pct, circ])
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        style={{ strokeDashoffset: off, transition: 'stroke-dashoffset 1.1s cubic-bezier(.34,1.56,.64,1)' }} />
    </svg>
  )
}

function AnimNum({ value }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let raf; const t0 = performance.now()
    const go = now => { const p = Math.min((now - t0) / 700, 1); setD(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(go) }
    raf = requestAnimationFrame(go); return () => cancelAnimationFrame(raf)
  }, [value])
  return <span>{fmt(d)}</span>
}

const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(6,8,15,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
      {label && <p style={{ color: '#64748b', fontSize: 11, marginBottom: 5, fontFamily: 'monospace' }}>{label}</p>}
      {payload.map((p, i) => <p key={i} style={{ color: p.color || p.fill || '#fff', fontWeight: 700, fontSize: 12, margin: '2px 0', fontFamily: 'monospace' }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const c = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', loading: '#f59e0b' }[type]
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, background: 'rgba(13,17,30,0.97)', border: `1px solid ${c}44`, borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 4px 24px ${c}22`, animation: 'fadeUp .3s ease' }}>
      <span style={{ color: c, fontSize: 16 }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'loading' ? '⟳' : 'ℹ'}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{msg}</span>
    </div>
  )
}

// ── DASHBOARD ─────────────────────────────────────────────
export default function Dashboard({ user }) {
  const [tab, setTab] = useState('overview')
  const [expenses, setExpenses] = useState([])
  const [history, setHistory] = useState([])
  const [income, setIncome] = useState({ salary: 1798.91, vtvr: 761.00, commission: 500.00 })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ msg: '', type: 'info' })
  const [filterCat, setFilterCat] = useState('Todos')
  const [showAdd, setShowAdd] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [newE, setNewE] = useState({ name: '', value: '', category: 'Cartão' })
  const [selHistory, setSelHistory] = useState(null)
  const [month, setMonth] = useState(curMonth())

  const totalIncome = income.salary + income.vtvr + income.commission
  const notify = (msg, type = 'info', ms = 2800) => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'info' }), ms) }

  // ── LOAD DATA ────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .order('created_at', { ascending: false })
    if (!error) setExpenses(data || [])
    else notify('Erro ao carregar despesas', 'error')
    setLoading(false)
  }, [user.id, month])

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('despesas')
      .select('month, value, paid')
      .eq('user_id', user.id)
    if (!data) return
    const byMonth = {}
    data.forEach(e => {
      if (!byMonth[e.month]) byMonth[e.month] = { total: 0, paid: 0, count: 0 }
      byMonth[e.month].total += Number(e.value)
      if (e.paid) byMonth[e.month].paid += Number(e.value)
      byMonth[e.month].count++
    })
    const sorted = Object.entries(byMonth)
      .map(([m, d]) => ({ month: m, label: monthLabel(m), income: totalIncome, ...d }))
      .sort((a, b) => a.month.localeCompare(b.month))
    setHistory(sorted)
  }, [user.id, totalIncome])

  const loadIncome = useCallback(async () => {
    const { data } = await supabase
      .from('receitas')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .single()
    if (data) setIncome({ salary: data.salary, vtvr: data.vtvr, commission: data.commission })
  }, [user.id, month])

  useEffect(() => { loadExpenses(); loadHistory(); loadIncome() }, [loadExpenses, loadHistory, loadIncome])

  // ── ACTIONS ──────────────────────────────────────────────
  const togglePaid = async (id, cur) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, paid: !cur } : e))
    const { error } = await supabase.from('despesas').update({ paid: !cur }).eq('id', id).eq('user_id', user.id)
    if (error) { setExpenses(prev => prev.map(e => e.id === id ? { ...e, paid: cur } : e)); notify('Erro ao atualizar', 'error'); return }
    notify(!cur ? '✓ Marcado como pago' : 'Desmarcado', 'success')
    loadHistory()
  }

  const addExpense = async () => {
    if (!newE.name.trim() || !newE.value || isNaN(parseFloat(newE.value))) { notify('Preencha nome e valor', 'error'); return }
    notify('Salvando...', 'loading', 1500)
    const { data, error } = await supabase.from('despesas').insert({
      user_id: user.id, name: newE.name.toUpperCase().trim(),
      value: parseFloat(newE.value), paid: false, category: newE.category, month
    }).select().single()
    if (error) { notify('Erro ao adicionar', 'error'); return }
    setExpenses(prev => [data, ...prev])
    setNewE({ name: '', value: '', category: 'Cartão' }); setShowAdd(false)
    notify('Despesa adicionada!', 'success'); loadHistory()
  }

  const removeExpense = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    const { error } = await supabase.from('despesas').delete().eq('id', id).eq('user_id', user.id)
    if (error) { notify('Erro ao remover', 'error'); loadExpenses(); return }
    notify('Despesa removida', 'success'); loadHistory()
  }

  const saveIncome = async () => {
    const payload = {
      salary: Number(income.salary) || 0,
      vtvr: Number(income.vtvr) || 0,
      commission: Number(income.commission) || 0
    }

    // Check if record already exists
    const { data: existing } = await supabase
      .from('receitas')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', month)
      .single()

    let error
    if (existing) {
      // UPDATE existing record
      const res = await supabase
        .from('receitas')
        .update(payload)
        .eq('user_id', user.id)
        .eq('month', month)
      error = res.error
    } else {
      // INSERT new record
      const res = await supabase
        .from('receitas')
        .insert({ user_id: user.id, month, ...payload })
      error = res.error
    }

    if (error) notify('Erro ao salvar receitas: ' + error.message, 'error')
    else {
      notify('Receitas salvas!', 'success')
      setShowIncome(false)
      loadIncome()
    }
  }

  const signOut = async () => { await supabase.auth.signOut() }

  // ── COMPUTEDS ────────────────────────────────────────────
  const total = expenses.reduce((s, e) => s + Number(e.value), 0)
  const paid = expenses.filter(e => e.paid).reduce((s, e) => s + Number(e.value), 0)
  const pending = total - paid
  const balance = totalIncome - total
  const pct = total > 0 ? (paid / total) * 100 : 0
  const filtered = filterCat === 'Todos' ? expenses : expenses.filter(e => e.category === filterCat)
  const catData = CATS.map(cat => ({
    name: cat, color: CAT_COLORS[cat],
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.value), 0),
    paidVal: expenses.filter(e => e.category === cat && e.paid).reduce((s, e) => s + Number(e.value), 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)
  const top5 = [...expenses].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5)

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const val = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    return { val, label: monthLabel(val) }
  })

  // ── STYLES ───────────────────────────────────────────────
  const G = {
    app: { minHeight: '100vh', background: '#06080f', color: '#e8eaf0', fontFamily: "'DM Sans', sans-serif", display: 'flex' },
    sidebar: { width: 200, background: 'rgba(13,17,30,0.98)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
    main: { flex: 1, padding: '28px 32px', overflowY: 'auto', minHeight: '100vh' },
    nav: (a) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: a ? '#a5b4fc' : '#3a4a68', borderLeft: `3px solid ${a ? '#6366f1' : 'transparent'}`, background: a ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all .15s' }),
    cards: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
    card: (c, b) => ({ background: 'rgba(13,17,30,0.9)', border: `1px solid ${b}`, borderRadius: 14, padding: '18px', position: 'relative', overflow: 'hidden', borderTop: `2px solid ${c}` }),
    sec: (b) => ({ background: 'rgba(13,17,30,0.9)', border: `1px solid ${b || 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '20px', marginBottom: 18 }),
    lbl: { fontSize: 9, letterSpacing: '2px', color: '#3a4a68', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 14 },
    row: { display: 'flex', gap: 16, marginBottom: 18 },
    expRow: (p) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10, cursor: 'pointer', marginBottom: 7, transition: 'all .15s', background: p ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)', border: `1px solid ${p ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)'}` }),
    pill: (c) => ({ background: c + '22', color: c, border: `1px solid ${c}44`, padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }),
    inp: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8eaf0', padding: '9px 12px', fontSize: 12, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' },
    btn: (bg) => ({ background: bg, border: 'none', borderRadius: 8, color: '#fff', padding: '9px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .15s' }),
    fBtn: (a, c) => ({ background: a ? (c || '#6366f1') + '22' : 'transparent', border: `1px solid ${a ? (c || '#6366f1') + '66' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, color: a ? (c || '#a5b4fc') : '#3a4a68', padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }),
  }

  const TABS = [['overview', '◈', 'Visão Geral'], ['expenses', '≡', 'Despesas'], ['charts', '◉', 'Gráficos'], ['history', '◷', 'Histórico']]
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'

  return (
    <div style={G.app}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* SIDEBAR */}
      <nav style={G.sidebar}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>💰</div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>FinanceControl</div>
          <div style={{ fontSize: 9, color: '#2a3550', fontFamily: 'monospace', marginTop: 2, letterSpacing: '1px' }}>MULTI-USER · SUPABASE</div>
        </div>

        {/* Month selector */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, letterSpacing: '1.5px', color: '#2a3550', fontFamily: 'monospace', marginBottom: 6 }}>MÊS</div>
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ ...G.inp, padding: '7px 10px', fontSize: 11, background: 'rgba(255,255,255,0.04)' }}>
            {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ fontSize: 9, letterSpacing: '2px', color: '#1e2a42', padding: '12px 20px 6px', fontFamily: 'monospace' }}>MENU</div>
        {TABS.map(([k, ic, lb]) => (
          <div key={k} style={G.nav(tab === k)} onClick={() => setTab(k)}>
            <span style={{ fontSize: 14 }}>{ic}</span> {lb}
          </div>
        ))}

        {/* User + logout */}
        <div style={{ marginTop: 'auto', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '9px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: 9, color: '#3a4a68', fontFamily: 'monospace', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          </div>
          <div style={{ background: balance >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${balance >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: balance >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700, fontFamily: 'monospace' }}>{balance >= 0 ? '✓ NO AZUL' : '⚠ DÉFICIT'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: balance >= 0 ? '#22c55e' : '#ef4444', marginTop: 2, fontFamily: 'monospace' }}>{fmt(Math.abs(balance)).replace('R$ ', 'R$')}</div>
          </div>
          <button onClick={signOut} style={{ ...G.btn('rgba(239,68,68,0.15)'), color: '#fca5a5', width: '100%', textAlign: 'center', fontSize: 11 }}>
            Sair →
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={G.main}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Olá, {userName.split(' ')[0]} 👋</div>
                <div style={{ fontSize: 11, color: '#3a4a68', fontFamily: 'monospace' }}>{monthLabel(month)} · {expenses.length} despesas</div>
              </div>
              <button onClick={() => setShowIncome(!showIncome)} style={G.btn('rgba(62,207,142,0.2)')}>
                {showIncome ? '✕ Fechar' : '✏ Editar Receitas'}
              </button>
            </div>

            {/* Edit income */}
            {showIncome && (
              <div style={{ ...G.sec('rgba(62,207,142,0.2)'), background: 'rgba(62,207,142,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 18 }}>
                {[['SALÁRIO', 'salary'], ['VT + VR', 'vtvr'], ['COMISSÃO', 'commission']].map(([lb, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, color: '#3a4a68', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>{lb}</div>
                    <input style={G.inp} type="number" value={income[key]}
                      onChange={e => setIncome(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
                <button style={{ ...G.btn('#3ECF8E'), alignSelf: 'flex-end' }} onClick={saveIncome}>Salvar</button>
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '40px 0', color: '#3a4a68', fontSize: 13 }}>
                <div style={{ width: 18, height: 18, border: '2px solid #3a4a68', borderTopColor: '#3ECF8E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Carregando do Supabase...
              </div>
            ) : (
              <>
                <div style={G.cards}>
                  {[
                    ['Receitas', totalIncome, '#22c55e', 'rgba(34,197,94,0.25)', '📈', 'salário + vt/vr + comissão'],
                    ['Despesas', total, '#ef4444', 'rgba(239,68,68,0.2)', '📉', `${expenses.length} lançamentos`],
                    ['Falta Pagar', pending, '#f59e0b', 'rgba(245,158,11,0.25)', '🔔', `${expenses.filter(e => !e.paid).length} pendentes`],
                    ['Saldo Final', Math.abs(balance), balance >= 0 ? '#818cf8' : '#ef4444', balance >= 0 ? 'rgba(99,102,241,0.25)' : 'rgba(239,68,68,0.2)', '💎', balance >= 0 ? 'disponível' : 'déficit'],
                  ].map(([lb, v, c, b, ic, sub]) => (
                    <div key={lb} style={G.card(c, b)}>
                      <div style={{ fontSize: 9, letterSpacing: '2px', color: '#3a4a68', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>{lb}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c, letterSpacing: '-0.5px' }}><AnimNum value={v} /></div>
                      <div style={{ fontSize: 10, color: '#3a4a68', marginTop: 5, fontFamily: 'monospace' }}>{sub}</div>
                      <div style={{ position: 'absolute', right: 14, top: 14, fontSize: 20, opacity: 0.1 }}>{ic}</div>
                    </div>
                  ))}
                </div>

                <div style={{ ...G.sec('rgba(99,102,241,0.18)'), display: 'flex', alignItems: 'center', gap: 22, background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(20,184,166,0.04))' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring pct={pct} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{Math.round(pct)}%</div>
                      <div style={{ fontSize: 8, color: '#3a4a68', fontFamily: 'monospace' }}>PAGO</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Progresso de Pagamentos</div>
                    <div style={{ fontSize: 11, color: '#3a4a68', fontFamily: 'monospace', marginBottom: 12 }}>{expenses.filter(e => e.paid).length} de {expenses.length} pagas · {monthLabel(month)}</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#86efac)', borderRadius: 99, transition: 'width 1s cubic-bezier(.34,1.56,.64,1)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, fontFamily: 'monospace' }}>
                      <span style={{ color: '#86efac' }}>✓ {fmt(paid)}</span>
                      <span style={{ color: '#fca5a5' }}>⏳ {fmt(pending)}</span>
                    </div>
                  </div>
                </div>

                <div style={G.row}>
                  <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                    <div style={G.lbl}>Composição das Receitas</div>
                    {[['SALÁRIO', income.salary, '#22c55e'], ['VT + VR', income.vtvr, '#3b82f6'], ['COMISSÃO', income.commission, '#f59e0b']].map(([lb, v, c]) => (
                      <div key={lb} style={{ marginBottom: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                          <span style={{ color: '#3a4a68', fontFamily: 'monospace' }}>{lb}</span>
                          <span style={{ fontWeight: 700, color: c, fontFamily: 'monospace' }}>{fmt(v)}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 99, height: 5 }}>
                          <div style={{ width: `${totalIncome > 0 ? (v / totalIncome) * 100 : 0}%`, height: '100%', background: c, borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, fontSize: 11 }}>
                      <span style={{ color: '#3a4a68', fontFamily: 'monospace' }}>TOTAL</span>
                      <span style={{ fontWeight: 800, color: '#22c55e', fontFamily: 'monospace' }}>{fmt(totalIncome)}</span>
                    </div>
                  </div>
                  <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                    <div style={G.lbl}>Top 5 Despesas</div>
                    {top5.length === 0 ? <div style={{ color: '#3a4a68', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nenhuma despesa ainda</div> :
                      top5.map((e, i) => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: CAT_COLORS[e.category] + '22', color: CAT_COLORS[e.category], fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 99, height: 3 }}>
                              <div style={{ width: `${(Number(e.value) / Number(top5[0].value)) * 100}%`, height: '100%', background: CAT_COLORS[e.category], borderRadius: 99 }} />
                            </div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', flexShrink: 0 }}>{fmt(e.value)}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EXPENSES ── */}
        {tab === 'expenses' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Despesas</div>
            <div style={{ fontSize: 11, color: '#3a4a68', fontFamily: 'monospace', marginBottom: 20 }}>{monthLabel(month)} · salvas automaticamente no Supabase</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Todos', ...CATS].map(c => (
                  <button key={c} style={G.fBtn(filterCat === c, CAT_COLORS[c])} onClick={() => setFilterCat(c)}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={G.btn('rgba(62,207,142,0.15)')} onClick={loadExpenses}>↺ Atualizar</button>
                <button style={G.btn('rgba(99,102,241,0.7)')} onClick={() => setShowAdd(!showAdd)}>
                  {showAdd ? '✕ Cancelar' : '+ Adicionar'}
                </button>
              </div>
            </div>

            {showAdd && (
              <div style={{ ...G.sec('rgba(99,102,241,0.2)'), display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, background: 'rgba(99,102,241,0.06)', marginBottom: 14 }}>
                {[['Descrição', 'text', 'name'], ['Valor (R$)', 'number', 'value']].map(([lb, tp, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, color: '#3a4a68', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>{lb.toUpperCase()}</div>
                    <input style={G.inp} type={tp} placeholder={key === 'name' ? 'Nome da despesa' : '0,00'}
                      value={newE[key]} onChange={e => setNewE(p => ({ ...p, [key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addExpense()} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 9, color: '#3a4a68', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>CATEGORIA</div>
                  <select style={{ ...G.inp, appearance: 'none' }} value={newE.category} onChange={e => setNewE(p => ({ ...p, category: e.target.value }))}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button style={{ ...G.btn('#22c55e'), alignSelf: 'flex-end' }} onClick={addExpense}>Salvar ✓</button>
              </div>
            )}

            <div style={G.sec()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ ...G.lbl, marginBottom: 0 }}>{filtered.length} despesas {filterCat !== 'Todos' && `· ${filterCat}`}</div>
                <span style={{ fontSize: 11, color: '#3a4a68', fontFamily: 'monospace' }}>Total: {fmt(filtered.reduce((s, e) => s + Number(e.value), 0))}</span>
              </div>
              {loading ? <div style={{ textAlign: 'center', padding: '30px', color: '#3a4a68', fontSize: 12 }}>Carregando...</div> :
                filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: '#3a4a68', fontSize: 12, fontFamily: 'monospace' }}>Nenhuma despesa em {monthLabel(month)}</div> :
                  filtered.map(e => (
                    <div key={e.id} style={G.expRow(e.paid)} onClick={() => togglePaid(e.id, e.paid)}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: e.paid ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.1)', color: e.paid ? '#22c55e' : '#ef4444', border: `1.5px solid ${e.paid ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.25)'}`, flexShrink: 0, transition: 'all .2s' }}>
                        {e.paid ? '✓' : '○'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{e.name}</div>
                        <span style={G.pill(CAT_COLORS[e.category] || '#6b7280')}>{e.category}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: e.paid ? '#86efac' : '#fca5a5' }}>{fmt(e.value)}</div>
                      <span style={{ ...G.pill(e.paid ? '#22c55e' : '#ef4444'), margin: '0 8px', fontSize: 9 }}>{e.paid ? 'PAGO' : 'PENDENTE'}</span>
                      <button onClick={ev => { ev.stopPropagation(); removeExpense(e.id) }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 7, color: '#ef4444', cursor: 'pointer', padding: '5px 9px', fontSize: 11 }}>✕</button>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── CHARTS ── */}
        {tab === 'charts' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Gráficos</div>
            <div style={{ fontSize: 11, color: '#3a4a68', fontFamily: 'monospace', marginBottom: 20 }}>{monthLabel(month)}</div>
            <div style={G.row}>
              <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                <div style={G.lbl}>Despesas por Categoria</div>
                {catData.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#3a4a68', fontSize: 12 }}>Sem dados</div> : (
                  <>
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {catData.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={<CTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
                      {catData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} />
                          <span style={{ color: '#3a4a68', fontFamily: 'monospace' }}>{d.name}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                <div style={G.lbl}>Receita vs Despesa</div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={[{ n: 'Receitas', v: totalIncome }, { n: 'Despesas', v: total }, { n: 'Pagas', v: paid }, { n: 'Saldo', v: Math.max(0, balance) }]} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="n" tick={{ fill: '#3a4a68', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#3a4a68', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="v" name="Valor" radius={[6, 6, 0, 0]}>
                      {['#22c55e', '#ef4444', '#3b82f6', '#818cf8'].map((c, i) => <Cell key={i} fill={c} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={G.sec()}>
              <div style={G.lbl}>Detalhamento por Categoria</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 11 }}>
                {catData.map(d => {
                  const p = d.value > 0 ? (d.paidVal / d.value) * 100 : 0
                  return (
                    <div key={d.name} style={{ background: d.color + '0e', border: `1px solid ${d.color}2a`, borderRadius: 11, padding: '12px 13px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: d.color, fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 5 }}>{d.name.toUpperCase()}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, fontFamily: 'monospace' }}>{fmt(d.value)}</div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 3 }}>
                        <div style={{ width: `${p}%`, height: '100%', background: d.color, borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 9, color: '#3a4a68', marginTop: 4, fontFamily: 'monospace' }}>{d.count} itens · {Math.round(p)}% pago</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Histórico Mensal</div>
            <div style={{ fontSize: 11, color: '#3a4a68', fontFamily: 'monospace', marginBottom: 20 }}>{history.length} meses registrados · dados reais do Supabase</div>

            {history.length > 1 && (
              <div style={G.sec()}>
                <div style={G.lbl}>Evolução Receitas vs Despesas</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: '#3a4a68', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#3a4a68', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CTip />} />
                    <Legend formatter={v => <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>{v}</span>} />
                    <Area type="monotone" dataKey="income" name="Receitas" stroke="#22c55e" strokeWidth={2} fill="url(#gI)" dot={{ fill: '#22c55e', r: 3 }} />
                    <Area type="monotone" dataKey="total" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#gE)" dot={{ fill: '#ef4444', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
              {history.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#3a4a68', fontSize: 12, fontFamily: 'monospace' }}>
                  Histórico aparece aqui conforme você registrar despesas em meses diferentes
                </div>
              ) : history.map((h, i) => {
                const bal = h.income - h.total
                const p = h.total > 0 ? (h.paid / h.total) * 100 : 0
                const c = bal >= 0 ? '#22c55e' : '#ef4444'
                const sel = selHistory === i
                return (
                  <div key={h.month} onClick={() => setSelHistory(sel ? null : i)}
                    style={{ background: sel ? 'rgba(99,102,241,0.1)' : 'rgba(13,17,30,0.9)', border: `1px solid ${sel ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '14px 15px', cursor: 'pointer', transition: 'all .2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#3a4a68', fontFamily: 'monospace' }}>{h.label}</span>
                      {h.month === month && <span style={{ fontSize: 8, background: 'rgba(245,158,11,0.2)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.3)', padding: '1px 7px', borderRadius: 20, fontFamily: 'monospace' }}>ATUAL</span>}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: 'monospace', marginBottom: 3 }}>{bal >= 0 ? '' : '-'}{fmt(Math.abs(bal)).replace('R$ ', 'R$')}</div>
                    <div style={{ fontSize: 10, color: '#3a4a68', fontFamily: 'monospace', marginBottom: 8 }}>{fmt(h.total)} gastos</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 99, height: 3 }}>
                      <div style={{ width: `${p}%`, height: '100%', background: c, borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {selHistory !== null && history[selHistory] && (() => {
              const h = history[selHistory]
              const bal = h.income - h.total
              const p = h.total > 0 ? (h.paid / h.total) * 100 : 0
              return (
                <div style={{ ...G.sec('rgba(99,102,241,0.18)'), background: 'rgba(99,102,241,0.06)' }}>
                  <div style={G.lbl}>Detalhes · {h.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                    {[['RECEITAS', fmt(h.income), '#22c55e'], ['DESPESAS', fmt(h.total), '#ef4444'], ['PAGAS', fmt(h.paid), '#3b82f6'],
                      ['SALDO', (bal >= 0 ? '' : '-') + fmt(Math.abs(bal)).replace('R$ ', 'R$'), bal >= 0 ? '#818cf8' : '#ef4444'],
                      ['% PAGO', Math.round(p) + '%', '#f59e0b'], ['Nº ITENS', h.count, '#8b5cf6']
                    ].map(([lb, v, c]) => (
                      <div key={lb} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '11px 13px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 8, color: '#3a4a68', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 4 }}>{lb}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </main>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  )
}
