import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, Legend
} from 'recharts'

/* ─────────────────── CONSTANTES ─────────────────── */
const CAT_COLORS = {
  'Cartão': '#f43f5e', 'Banco': '#3b82f6', 'Serviços': '#a78bfa',
  'Moradia': '#f59e0b', 'Transporte': '#10b981', 'Mercado': '#fb923c', 'Outros': '#94a3b8',
}
const CATS = Object.keys(CAT_COLORS)
const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK = v => 'R$' + (v / 1000).toFixed(1).replace('.', ',') + 'k'
const curMonth = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
const monthLabel = m => { if (!m) return ''; const [mo, yr] = m.split('/'); const n = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${n[parseInt(mo)-1]}/${yr.slice(2)}` }

/* ─────────────────── TEMA ─────────────────── */
function useTheme() {
  const [mode, setMode] = useState(() => localStorage.getItem('fc_theme') || 'dark')
  useEffect(() => { localStorage.setItem('fc_theme', mode) }, [mode])

  const systemDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && systemDark)

  const T = isDark ? {
    bg: '#070b14',
    bgCard: 'rgba(10,14,26,0.95)',
    border: 'rgba(255,255,255,0.07)',
    text: '#e2e8f0',
    textMuted: '#475569',
    textFaint: '#1e293b',
    sidebar: 'rgba(8,11,22,0.98)',
    input: 'rgba(255,255,255,0.05)',
    inputBorder: 'rgba(255,255,255,0.08)',
    expPaid: 'rgba(16,185,129,0.06)',
    expPaidBorder: 'rgba(16,185,129,0.18)',
    expPending: 'rgba(244,63,94,0.05)',
    expPendingBorder: 'rgba(244,63,94,0.15)',
    chartGrid: 'rgba(255,255,255,0.04)',
    glass: 'rgba(255,255,255,0.02)',
    scrollbar: '#1e293b',
    isDark: true,
  } : {
    bg: '#eef2ff',
    bgCard: 'rgba(255,255,255,0.95)',
    border: 'rgba(0,0,0,0.08)',
    text: '#0f172a',
    textMuted: '#64748b',
    textFaint: '#cbd5e1',
    sidebar: 'rgba(248,250,255,0.99)',
    input: 'rgba(0,0,0,0.04)',
    inputBorder: 'rgba(0,0,0,0.1)',
    expPaid: 'rgba(16,185,129,0.06)',
    expPaidBorder: 'rgba(16,185,129,0.25)',
    expPending: 'rgba(244,63,94,0.04)',
    expPendingBorder: 'rgba(244,63,94,0.2)',
    chartGrid: 'rgba(0,0,0,0.05)',
    glass: 'rgba(0,0,0,0.015)',
    scrollbar: '#cbd5e1',
    isDark: false,
  }

  return { mode, setMode, isDark, T }
}

/* ─────────────────── MICRO-COMPONENTES ─────────────────── */
function Ring({ pct, size = 90, stroke = 8, color = '#6366f1', T }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [off, setOff] = useState(circ)
  useEffect(() => { const t = setTimeout(() => setOff(circ - (pct / 100) * circ), 80); return () => clearTimeout(t) }, [pct, circ])
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
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

const CTip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: isDark ? 'rgba(7,11,20,0.97)' : 'rgba(255,255,255,0.97)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
      {label && <p style={{ color: '#64748b', fontSize: 11, marginBottom: 5, fontFamily: 'monospace' }}>{label}</p>}
      {payload.map((p, i) => <p key={i} style={{ color: p.color || p.fill, fontWeight: 700, fontSize: 12, margin: '2px 0', fontFamily: 'monospace' }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const c = { success: '#10b981', error: '#f43f5e', info: '#3b82f6', loading: '#f59e0b' }[type] || '#3b82f6'
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, background: 'rgba(7,11,20,0.97)', border: `1px solid ${c}44`, borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 32px ${c}22`, animation: 'fadeUp .3s ease' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{msg}</span>
    </div>
  )
}

function ThemeToggle({ mode, setMode, isDark, T }) {
  const opts = [['dark', '🌙', 'Escuro'], ['light', '☀️', 'Claro'], ['system', '💻', 'Sistema']]
  return (
    <div style={{ display: 'flex', gap: 3, background: T.input, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
      {opts.map(([k, ic, lb]) => (
        <button key={k} onClick={() => setMode(k)} title={lb}
          style={{ background: mode === k ? (isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)') : 'transparent', border: mode === k ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 12, transition: 'all .15s', lineHeight: 1 }}>
          {ic}
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, color, borderColor, icon, T }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${hovered ? borderColor : T.border}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden', borderTop: `2px solid ${color}`, transition: 'all .2s', transform: hovered ? 'translateY(-2px)' : 'none', boxShadow: hovered ? `0 8px 32px ${color}15` : 'none' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ fontSize: 9, letterSpacing: '2px', color: T.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.5px' }}><AnimNum value={value} /></div>
      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 5, fontFamily: 'monospace' }}>{sub}</div>
      <div style={{ position: 'absolute', right: 14, top: 14, fontSize: 22, opacity: 0.08 }}>{icon}</div>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${color}10, transparent 60%)`, pointerEvents: 'none' }} />
    </div>
  )
}

/* ─────────────────── DASHBOARD ─────────────────── */
export default function Dashboard({ user }) {
  const { mode, setMode, isDark, T } = useTheme()
  const [tab, setTab] = useState('overview')
  const [expenses, setExpenses] = useState([])
  const [history, setHistory] = useState([])
  const [income, setIncome] = useState({ salary: 0, vtvr: 0, commission: 0 })
  // Estado separado para edição — FIX do bug de receita
  const [incomeEdit, setIncomeEdit] = useState({ salary: '', vtvr: '', commission: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ msg: '', type: 'info' })
  const [filterCat, setFilterCat] = useState('Todos')
  const [showAdd, setShowAdd] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [newE, setNewE] = useState({ name: '', value: '', category: 'Cart00e3o', parcelas: '1' })
  const [selHistory, setSelHistory] = useState(null)
  const [month, setMonth] = useState(curMonth())

  const totalIncome = income.salary + income.vtvr + income.commission
  const notify = (msg, type = 'info', ms = 2800) => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'info' }), ms) }

  /* ── LOAD ── */
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('despesas').select('*').eq('user_id', user.id).eq('month', month).order('created_at', { ascending: false })
    if (!error) setExpenses(data || [])
    else notify('Erro ao carregar despesas', 'error')
    setLoading(false)
  }, [user.id, month])

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('despesas').select('month, value, paid').eq('user_id', user.id)
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
    const { data } = await supabase.from('receitas').select('*').eq('user_id', user.id).eq('month', month).single()
    if (data) {
      const vals = { salary: data.salary ?? 0, vtvr: data.vtvr ?? 0, commission: data.commission ?? 0 }
      setIncome(vals)
      // sync edição com valores atuais
      setIncomeEdit({ salary: String(vals.salary), vtvr: String(vals.vtvr), commission: String(vals.commission) })
    } else {
      setIncome({ salary: 0, vtvr: 0, commission: 0 })
      setIncomeEdit({ salary: '', vtvr: '', commission: '' })
    }
  }, [user.id, month])

  useEffect(() => { loadExpenses(); loadHistory(); loadIncome() }, [loadExpenses, loadHistory, loadIncome])

  /* ── INCOME: sempre sincroniza ao abrir ── */
  const toggleIncomePanel = () => {
    if (!showIncome) {
      // FIX: re-sincroniza os campos toda vez que abre
      setIncomeEdit({
        salary: String(income.salary),
        vtvr: String(income.vtvr),
        commission: String(income.commission),
      })
    }
    setShowIncome(v => !v)
  }

  /* ── ACTIONS ── */
  const togglePaid = async (id, cur) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, paid: !cur } : e))
    const { error } = await supabase.from('despesas').update({ paid: !cur }).eq('id', id).eq('user_id', user.id)
    if (error) { setExpenses(prev => prev.map(e => e.id === id ? { ...e, paid: cur } : e)); notify('Erro ao atualizar', 'error'); return }
    notify(!cur ? '✓ Marcado como pago' : 'Desmarcado', 'success')
    loadHistory()
  }

  const addExpense = async () => {
    if (!newE.name.trim() || !newE.value || isNaN(parseFloat(newE.value))) { notify('Preencha nome e valor', 'error'); return }
    const parcelas = Math.max(1, Math.min(60, parseInt(newE.parcelas) || 1))
    const valorParcela = parseFloat(newE.value)
    const nomeParcela = newE.name.toUpperCase().trim()

    if (parcelas === 1) {
      // Despesa simples — comportamento original
      notify('Salvando...', 'loading', 1500)
      const { data, error } = await supabase.from('despesas').insert({
        user_id: user.id, name: nomeParcela, value: valorParcela,
        paid: false, category: newE.category, month,
        parcela_atual: null, parcelas_total: null, parcela_grupo: null
      }).select().single()
      if (error) { notify('Erro ao adicionar', 'error'); return }
      setExpenses(prev => [data, ...prev])
    } else {
      // Parcelado — cria uma linha por mês
      notify(`Criando ${parcelas} parcelas...`, 'loading', 2500)
      const grupo = `${nomeParcela}_${Date.now()}`
      const rows = []
      const [mesAtual, anoAtual] = month.split('/').map(Number)
      for (let i = 0; i < parcelas; i++) {
        const d = new Date(anoAtual, mesAtual - 1 + i, 1)
        const m = `${String(d.getMonth() + 1).padStart(2,'0')}/${d.getFullYear()}`
        rows.push({
          user_id: user.id,
          name: `${nomeParcela} (${i+1}/${parcelas})`,
          value: valorParcela,
          paid: false,
          category: newE.category,
          month: m,
          parcela_atual: i + 1,
          parcelas_total: parcelas,
          parcela_grupo: grupo
        })
      }
      const { error } = await supabase.from('despesas').insert(rows)
      if (error) { notify('Erro ao criar parcelas', 'error'); return }
      notify(`${parcelas} parcelas criadas!`, 'success')
    }

    setNewE({ name: '', value: '', category: 'Cartão', parcelas: '1' })
    setShowAdd(false)
    loadExpenses()
    loadHistory()
  }

  const removeExpense = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    const { error } = await supabase.from('despesas').delete().eq('id', id).eq('user_id', user.id)
    if (error) { notify('Erro ao remover', 'error'); loadExpenses(); return }
    notify('Despesa removida', 'success'); loadHistory()
  }

  const saveIncome = async () => {
    const payload = {
      salary: parseFloat(incomeEdit.salary) || 0,
      vtvr: parseFloat(incomeEdit.vtvr) || 0,
      commission: parseFloat(incomeEdit.commission) || 0,
    }
    const { data: existing } = await supabase.from('receitas').select('id').eq('user_id', user.id).eq('month', month).single()
    let error
    if (existing) {
      const res = await supabase.from('receitas').update(payload).eq('user_id', user.id).eq('month', month)
      error = res.error
    } else {
      const res = await supabase.from('receitas').insert({ user_id: user.id, month, ...payload })
      error = res.error
    }
    if (error) { notify('Erro ao salvar: ' + error.message, 'error'); return }
    setIncome(payload)
    notify('Receitas salvas!', 'success')
    setShowIncome(false)
    loadHistory()
  }

  const signOut = async () => { await supabase.auth.signOut() }

  /* ── COMPUTEDS ── */
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
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const val = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    return { val, label: monthLabel(val) }
  })

  /* ── STYLES ── */
  const G = {
    app: { minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Inter', 'DM Sans', sans-serif", display: 'flex', transition: 'background .3s, color .3s' },
    sidebar: { width: 214, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0, transition: 'background .3s' },
    main: { flex: 1, padding: '28px 32px', overflowY: 'auto', minHeight: '100vh' },
    nav: (a) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: a ? '#818cf8' : T.textMuted, borderLeft: `3px solid ${a ? '#6366f1' : 'transparent'}`, background: a ? (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)') : 'transparent', transition: 'all .15s' }),
    cards: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 },
    sec: (b) => ({ background: T.bgCard, border: `1px solid ${b || T.border}`, borderRadius: 16, padding: '20px', marginBottom: 18, transition: 'background .3s' }),
    lbl: { fontSize: 9, letterSpacing: '2px', color: T.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 14 },
    row: { display: 'flex', gap: 16, marginBottom: 18 },
    expRow: (p) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer', marginBottom: 7, transition: 'all .15s', background: p ? T.expPaid : T.expPending, border: `1px solid ${p ? T.expPaidBorder : T.expPendingBorder}` }),
    pill: (c) => ({ background: c + '22', color: c, border: `1px solid ${c}44`, padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }),
    inp: { background: T.input, border: `1px solid ${T.inputBorder}`, borderRadius: 10, color: T.text, padding: '10px 13px', fontSize: 12, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .2s' },
    btn: (bg) => ({ background: bg, border: 'none', borderRadius: 10, color: '#fff', padding: '9px 18px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }),
    fBtn: (a, c) => ({ background: a ? (c || '#6366f1') + '20' : 'transparent', border: `1px solid ${a ? (c || '#6366f1') + '55' : T.border}`, borderRadius: 8, color: a ? (c || '#818cf8') : T.textMuted, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }),
  }

  const TABS = [['overview', '⊞', 'Visão Geral'], ['expenses', '≡', 'Despesas'], ['charts', '◉', 'Gráficos'], ['history', '◷', 'Histórico']]
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'

  return (
    <div style={G.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.scrollbar};border-radius:3px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        select option{background:${isDark ? '#0d1117' : '#fff'};color:${T.text}}
        input:focus,select:focus{border-color:rgba(99,102,241,0.5)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
      `}</style>

      {/* ── SIDEBAR ── */}
      <nav style={G.sidebar}>
        <div style={{ padding: '20px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>💰</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.3px' }}>FinanceControl</div>
              <div style={{ fontSize: 9, color: T.textMuted, fontFamily: 'monospace' }}>SUPABASE · MULTI-USER</div>
            </div>
          </div>
          <ThemeToggle mode={mode} setMode={setMode} isDark={isDark} T={T} />
        </div>

        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, letterSpacing: '1.5px', color: T.textMuted, fontFamily: 'monospace', marginBottom: 6 }}>MÊS</div>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ ...G.inp, padding: '7px 10px', fontSize: 11 }}>
            {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ fontSize: 9, letterSpacing: '2px', color: T.textFaint, padding: '12px 18px 4px', fontFamily: 'monospace' }}>NAVEGAÇÃO</div>
        {TABS.map(([k, ic, lb]) => (
          <div key={k} style={G.nav(tab === k)} onClick={() => setTab(k)}>
            <span style={{ fontSize: 14, opacity: tab === k ? 1 : 0.45 }}>{ic}</span> {lb}
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '12px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ background: balance >= 0 ? (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)') : (isDark ? 'rgba(244,63,94,0.1)' : 'rgba(244,63,94,0.06)'), border: `1px solid ${balance >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`, borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: balance >= 0 ? '#6ee7b7' : '#fda4af', fontWeight: 700, fontFamily: 'monospace' }}>{balance >= 0 ? '✓ NO AZUL' : '⚠ DÉFICIT'}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: balance >= 0 ? '#10b981' : '#f43f5e', marginTop: 2, fontFamily: 'monospace' }}>{fmt(Math.abs(balance))}</div>
          </div>
          <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 11px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: 9, color: T.textMuted, fontFamily: 'monospace', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          </div>
          <button onClick={signOut} style={{ ...G.btn('transparent'), color: '#f43f5e', width: '100%', fontSize: 11, border: '1px solid rgba(244,63,94,0.25)', padding: '8px' }}>
            Sair →
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={G.main}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Olá, {userName.split(' ')[0]} 👋</div>
                <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace' }}>{monthLabel(month)} · {expenses.length} despesas</div>
              </div>
              <button onClick={toggleIncomePanel}
                style={{ ...G.btn(showIncome ? 'rgba(244,63,94,0.18)' : 'rgba(16,185,129,0.18)'), color: showIncome ? '#f43f5e' : '#10b981', border: `1px solid ${showIncome ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                {showIncome ? '✕ Fechar' : '✏ Editar Receitas'}
              </button>
            </div>

            {/* Edit income — FIX: usa incomeEdit separado + re-sincroniza ao abrir */}
            {showIncome && (
              <div style={{ ...G.sec('rgba(16,185,129,0.2)'), background: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.04)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 14, marginBottom: 20 }}>
                {[['SALÁRIO', 'salary'], ['VT + VR', 'vtvr'], ['COMISSÃO', 'commission']].map(([lb, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 7, fontFamily: 'monospace', letterSpacing: '1px' }}>{lb}</div>
                    <input style={G.inp} type="number" step="0.01" placeholder="0,00"
                      value={incomeEdit[key]}
                      onChange={e => setIncomeEdit(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <button style={{ ...G.btn('linear-gradient(135deg,#10b981,#059669)'), alignSelf: 'flex-end', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }} onClick={saveIncome}>Salvar ✓</button>
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '60px 0', color: T.textMuted, fontSize: 13, justifyContent: 'center' }}>
                <div style={{ width: 18, height: 18, border: `2px solid ${T.border}`, borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Carregando...
              </div>
            ) : (
              <>
                <div style={G.cards}>
                  <StatCard label="Receitas" value={totalIncome} color="#10b981" borderColor="rgba(16,185,129,0.2)" icon="📈" sub={`salário + vt/vr + comissão`} T={T} />
                  <StatCard label="Despesas" value={total} color="#f43f5e" borderColor="rgba(244,63,94,0.2)" icon="📉" sub={`${expenses.length} lançamentos`} T={T} />
                  <StatCard label="Falta Pagar" value={pending} color="#f59e0b" borderColor="rgba(245,158,11,0.2)" icon="🔔" sub={`${expenses.filter(e=>!e.paid).length} pendentes`} T={T} />
                  <StatCard label="Saldo Final" value={Math.abs(balance)} color={balance >= 0 ? '#818cf8' : '#f43f5e'} borderColor={balance >= 0 ? 'rgba(129,140,248,0.2)' : 'rgba(244,63,94,0.2)'} icon="💎" sub={balance >= 0 ? 'disponível' : 'déficit'} T={T} />
                </div>

                <div style={{ ...G.sec('rgba(99,102,241,0.15)'), display: 'flex', alignItems: 'center', gap: 24, background: isDark ? 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.04))' : 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.03))' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring pct={pct} T={T} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{Math.round(pct)}%</div>
                      <div style={{ fontSize: 8, color: T.textMuted, fontFamily: 'monospace' }}>PAGO</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>Progresso de Pagamentos</div>
                    <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginBottom: 14 }}>{expenses.filter(e=>e.paid).length} de {expenses.length} pagas · {monthLabel(month)}</div>
                    <div style={{ background: T.border, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: 99, transition: 'width 1s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 0 10px rgba(99,102,241,0.5)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, fontFamily: 'monospace' }}>
                      <span style={{ color: '#10b981' }}>✓ {fmt(paid)}</span>
                      <span style={{ color: '#f43f5e' }}>⏳ {fmt(pending)}</span>
                    </div>
                  </div>
                </div>

                <div style={G.row}>
                  <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                    <div style={G.lbl}>Composição das Receitas</div>
                    {[['SALÁRIO', income.salary, '#10b981'], ['VT + VR', income.vtvr, '#3b82f6'], ['COMISSÃO', income.commission, '#f59e0b']].map(([lb, v, c]) => (
                      <div key={lb} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                          <span style={{ color: T.textMuted, fontFamily: 'monospace' }}>{lb}</span>
                          <span style={{ fontWeight: 700, color: c, fontFamily: 'monospace' }}>{fmt(v)}</span>
                        </div>
                        <div style={{ background: T.border, borderRadius: 99, height: 5 }}>
                          <div style={{ width: `${totalIncome > 0 ? (v / totalIncome) * 100 : 0}%`, height: '100%', background: c, borderRadius: 99, boxShadow: `0 0 6px ${c}66` }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${T.border}`, paddingTop: 10, fontSize: 11 }}>
                      <span style={{ color: T.textMuted, fontFamily: 'monospace' }}>TOTAL</span>
                      <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>{fmt(totalIncome)}</span>
                    </div>
                  </div>
                  <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                    <div style={G.lbl}>Top 5 Despesas</div>
                    {top5.length === 0 ? <div style={{ color: T.textMuted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nenhuma despesa ainda</div> :
                      top5.map((e, i) => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 7, background: CAT_COLORS[e.category] + '22', color: CAT_COLORS[e.category], fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                            <div style={{ background: T.border, borderRadius: 99, height: 3 }}>
                              <div style={{ width: `${(Number(e.value)/Number(top5[0].value))*100}%`, height: '100%', background: CAT_COLORS[e.category], borderRadius: 99 }} />
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

        {/* EXPENSES */}
        {tab === 'expenses' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Despesas</div>
            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginBottom: 20 }}>{monthLabel(month)} · {expenses.length} registros</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Todos', ...CATS].map(c => <button key={c} style={G.fBtn(filterCat === c, CAT_COLORS[c])} onClick={() => setFilterCat(c)}>{c}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...G.fBtn(false), padding: '7px 14px' }} onClick={loadExpenses}>↺ Atualizar</button>
                <button style={{ ...G.btn('linear-gradient(135deg,#6366f1,#8b5cf6)'), boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }} onClick={() => setShowAdd(v => !v)}>
                  {showAdd ? '✕ Cancelar' : '+ Adicionar'}
                </button>
              </div>
            </div>

            {showAdd && (
              <div style={{ ...G.sec('rgba(99,102,241,0.2)'), background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, marginBottom: parseInt(newE.parcelas) > 1 ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>DESCRIÇÃO</div>
                    <input style={G.inp} type="text" placeholder="Nome da despesa" value={newE.name} onChange={e => setNewE(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addExpense()} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>VALOR (R$)</div>
                    <input style={G.inp} type="number" placeholder="0,00" value={newE.value} onChange={e => setNewE(p => ({ ...p, value: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>PARCELAS</div>
                    <input style={G.inp} type="number" min="1" max="60" placeholder="1" value={newE.parcelas} onChange={e => setNewE(p => ({ ...p, parcelas: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: '1px' }}>CATEGORIA</div>
                    <select style={{ ...G.inp, cursor: 'pointer' }} value={newE.category} onChange={e => setNewE(p => ({ ...p, category: e.target.value }))}>
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button style={{ ...G.btn('linear-gradient(135deg,#10b981,#059669)'), alignSelf: 'flex-end', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }} onClick={addExpense}>
                    {parseInt(newE.parcelas) > 1 ? `Criar ${newE.parcelas}x ✓` : 'Salvar ✓'}
                  </button>
                </div>
                {parseInt(newE.parcelas) > 1 && newE.value && (
                  <div style={{ background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📅</span>
                    <span>
                      <strong>{newE.parcelas}x</strong> de <strong>R$ {parseFloat(newE.value || 0).toFixed(2).replace('.', ',')}</strong> — parcelas serão criadas automaticamente nos próximos {newE.parcelas} meses e desaparecerão conforme forem pagas no último mês
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={G.sec()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ ...G.lbl, marginBottom: 0 }}>{filtered.length} despesas{filterCat !== 'Todos' ? ` · ${filterCat}` : ''}</div>
                <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace' }}>Total: {fmt(filtered.reduce((s, e) => s + Number(e.value), 0))}</span>
              </div>
              {loading ? <div style={{ textAlign: 'center', padding: '30px', color: T.textMuted, fontSize: 12 }}>Carregando...</div>
                : filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: T.textMuted, fontSize: 12, fontFamily: 'monospace' }}>Nenhuma despesa em {monthLabel(month)}</div>
                : filtered.map(e => (
                  <div key={e.id} style={G.expRow(e.paid)} onClick={() => togglePaid(e.id, e.paid)}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: e.paid ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.1)', color: e.paid ? '#10b981' : '#f43f5e', border: `1.5px solid ${e.paid ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.3)'}`, flexShrink: 0, transition: 'all .2s' }}>
                      {e.paid ? '✓' : '○'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{e.name}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={G.pill(CAT_COLORS[e.category] || '#94a3b8')}>{e.category}</span>
                        {e.parcelas_total > 1 && (
                          <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', padding: '2px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}>
                            📅 {e.parcela_atual}/{e.parcelas_total}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: e.paid ? '#10b981' : '#f43f5e' }}>{fmt(e.value)}</div>
                    <span style={{ ...G.pill(e.paid ? '#10b981' : '#f43f5e'), margin: '0 8px', fontSize: 9 }}>{e.paid ? 'PAGO' : 'PENDENTE'}</span>
                    <button onClick={ev => { ev.stopPropagation(); removeExpense(e.id) }}
                      style={{ background: 'rgba(244,63,94,0.1)', border: 'none', borderRadius: 8, color: '#f43f5e', cursor: 'pointer', padding: '5px 9px', fontSize: 11, transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.22)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}>✕</button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* CHARTS */}
        {tab === 'charts' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Gráficos</div>
            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginBottom: 20 }}>{monthLabel(month)}</div>
            <div style={G.row}>
              <div style={{ ...G.sec(), flex: 1, marginBottom: 0 }}>
                <div style={G.lbl}>Despesas por Categoria</div>
                {catData.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: T.textMuted, fontSize: 12 }}>Sem dados</div> : (
                  <>
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {catData.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={<CTip isDark={isDark} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {catData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />
                          <span style={{ color: T.textMuted, fontFamily: 'monospace' }}>{d.name}</span>
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
                  <BarChart data={[{n:'Receitas',v:totalIncome},{n:'Despesas',v:total},{n:'Pagas',v:paid},{n:'Saldo',v:Math.max(0,balance)}]} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} />
                    <XAxis dataKey="n" tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CTip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="v" name="Valor" radius={[6,6,0,0]}>
                      {['#10b981','#f43f5e','#3b82f6','#818cf8'].map((c,i) => <Cell key={i} fill={c} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={G.sec()}>
              <div style={G.lbl}>Detalhamento por Categoria</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12 }}>
                {catData.map(d => {
                  const p = d.value > 0 ? (d.paidVal / d.value) * 100 : 0
                  return (
                    <div key={d.name} style={{ background: d.color + '12', border: `1px solid ${d.color}28`, borderRadius: 12, padding: '13px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: d.color, fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 6 }}>{d.name.toUpperCase()}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 7, fontFamily: 'monospace', color: T.text }}>{fmt(d.value)}</div>
                      <div style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 99, height: 3 }}>
                        <div style={{ width: `${p}%`, height: '100%', background: d.color, borderRadius: 99, boxShadow: `0 0 6px ${d.color}66` }} />
                      </div>
                      <div style={{ fontSize: 9, color: T.textMuted, marginTop: 5, fontFamily: 'monospace' }}>{d.count} itens · {Math.round(p)}% pago</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', marginBottom: 3 }}>Histórico Mensal</div>
            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginBottom: 20 }}>{history.length} meses · dados do Supabase</div>

            {history.length > 1 && (
              <div style={G.sec()}>
                <div style={G.lbl}>Evolução Receitas vs Despesas</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} />
                    <XAxis dataKey="label" tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CTip isDark={isDark} />} />
                    <Legend formatter={v => <span style={{ color: T.textMuted, fontSize: 10, fontFamily: 'monospace' }}>{v}</span>} />
                    <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#gI)" dot={{ fill: '#10b981', r: 3 }} />
                    <Area type="monotone" dataKey="total" name="Despesas" stroke="#f43f5e" strokeWidth={2} fill="url(#gE)" dot={{ fill: '#f43f5e', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
              {history.length === 0
                ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: T.textMuted, fontSize: 12, fontFamily: 'monospace' }}>Histórico aparece aqui conforme você registrar despesas em meses diferentes</div>
                : history.map((h, i) => {
                  const bal = h.income - h.total
                  const p = h.total > 0 ? (h.paid / h.total) * 100 : 0
                  const c = bal >= 0 ? '#10b981' : '#f43f5e'
                  const sel = selHistory === i
                  return (
                    <div key={h.month} onClick={() => setSelHistory(sel ? null : i)}
                      style={{ background: sel ? (isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)') : T.bgCard, border: `1px solid ${sel ? 'rgba(99,102,241,0.4)' : T.border}`, borderRadius: 14, padding: '14px 15px', cursor: 'pointer', transition: 'all .2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, fontFamily: 'monospace' }}>{h.label}</span>
                        {h.month === month && <span style={{ fontSize: 8, background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.3)', padding: '1px 7px', borderRadius: 20, fontFamily: 'monospace' }}>ATUAL</span>}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: 'monospace', marginBottom: 3 }}>{bal >= 0 ? '' : '-'}{fmt(Math.abs(bal))}</div>
                      <div style={{ fontSize: 10, color: T.textMuted, fontFamily: 'monospace', marginBottom: 9 }}>{fmt(h.total)} gastos</div>
                      <div style={{ background: T.border, borderRadius: 99, height: 3 }}>
                        <div style={{ width: `${p}%`, height: '100%', background: c, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })
              }
            </div>

            {selHistory !== null && history[selHistory] && (() => {
              const h = history[selHistory]
              const bal = h.income - h.total
              const p = h.total > 0 ? (h.paid / h.total) * 100 : 0
              return (
                <div style={{ ...G.sec('rgba(99,102,241,0.18)'), background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' }}>
                  <div style={G.lbl}>Detalhes · {h.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                    {[['RECEITAS', fmt(h.income), '#10b981'], ['DESPESAS', fmt(h.total), '#f43f5e'], ['PAGAS', fmt(h.paid), '#3b82f6'],
                      ['SALDO', (bal >= 0 ? '' : '-') + fmt(Math.abs(bal)), bal >= 0 ? '#818cf8' : '#f43f5e'],
                      ['% PAGO', Math.round(p) + '%', '#f59e0b'], ['Nº ITENS', h.count, '#a78bfa']
                    ].map(([lb, v, c]) => (
                      <div key={lb} style={{ background: T.glass, borderRadius: 10, padding: '11px 13px', border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 8, color: T.textMuted, fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 4 }}>{lb}</div>
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
