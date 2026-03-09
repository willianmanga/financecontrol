import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, Legend
} from 'recharts'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CAT_COLORS = {
  'Cartão':'#f43f5e','Banco':'#3b82f6','Serviços':'#a78bfa',
  'Moradia':'#f59e0b','Transporte':'#10b981','Mercado':'#fb923c','Outros':'#94a3b8'
}
const CATS = Object.keys(CAT_COLORS)
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const INCOME_COLORS = ['#10b981','#3b82f6','#f59e0b','#a78bfa','#fb923c','#f43f5e']

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt  = v => 'R$ ' + Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtK = v => 'R$'+(v/1000).toFixed(1).replace('.',',')+' k'

const curMonth = () => {
  const d = new Date()
  return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const monthLabel = m => {
  if (!m) return ''
  const [mo, yr] = m.split('/')
  return `${MONTH_NAMES[parseInt(mo)-1]}/${yr.slice(2)}`
}

const buildMonthOptions = () => {
  const opts = []
  for (let m = 12; m >= 1; m--) {
    const val = `${String(m).padStart(2,'0')}/2026`
    opts.push({ val, label: monthLabel(val) })
  }
  return opts
}

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useTheme() {
  const [mode, setMode] = useState(() => localStorage.getItem('fc_theme') || 'dark')
  useEffect(() => { localStorage.setItem('fc_theme', mode) }, [mode])
  const sysDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && sysDark)
  const T = isDark ? {
    bg:'#050810', bgCard:'rgba(8,12,24,0.97)', border:'rgba(99,102,241,0.12)',
    text:'#e2e8f0', textMuted:'#475569', textFaint:'#1e293b',
    sidebar:'rgba(5,8,16,0.99)', input:'rgba(99,102,241,0.06)', inputBorder:'rgba(99,102,241,0.15)',
    expPaid:'rgba(16,185,129,0.06)', expPaidBorder:'rgba(16,185,129,0.18)',
    expPending:'rgba(244,63,94,0.05)', expPendingBorder:'rgba(244,63,94,0.15)',
    chartGrid:'rgba(255,255,255,0.04)', glass:'rgba(255,255,255,0.02)', isDark:true,
  } : {
    bg:'#eef2ff', bgCard:'rgba(255,255,255,0.95)', border:'rgba(0,0,0,0.08)',
    text:'#0f172a', textMuted:'#64748b', textFaint:'#cbd5e1',
    sidebar:'rgba(248,250,255,0.99)', input:'rgba(0,0,0,0.04)', inputBorder:'rgba(0,0,0,0.1)',
    expPaid:'rgba(16,185,129,0.06)', expPaidBorder:'rgba(16,185,129,0.25)',
    expPending:'rgba(244,63,94,0.04)', expPendingBorder:'rgba(244,63,94,0.2)',
    chartGrid:'rgba(0,0,0,0.05)', glass:'rgba(0,0,0,0.015)', isDark:false,
  }
  return { mode, setMode, isDark, T }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ─────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────
function Ring({ pct, size=90, stroke=8, color='#6366f1', T }) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r
  const [off, setOff] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOff(circ*(1-pct/100)), 100)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        style={{strokeDashoffset:off,transition:'stroke-dashoffset 1.1s cubic-bezier(.34,1.56,.64,1)'}}/>
    </svg>
  )
}

function CTip({ active, payload, label, isDark }) {
  if (!active || !payload?.length) return null
  const bg     = isDark ? 'rgba(10,14,26,0.97)' : 'rgba(255,255,255,0.97)'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  return (
    <div style={{background:bg,border:`1px solid ${border}`,borderRadius:10,padding:'10px 14px',backdropFilter:'blur(20px)'}}>
      {label && <p style={{color:'#64748b',fontSize:11,marginBottom:5,fontFamily:"'JetBrains Mono',monospace"}}>{label}</p>}
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color||p.fill,fontWeight:700,fontSize:12,margin:'2px 0',fontFamily:"'JetBrains Mono',monospace"}}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

function StatCard({ label, value, color, borderColor, sub, T }) {
  return (
    <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:'16px 18px',position:'relative',overflow:'hidden',borderTop:`2px solid ${borderColor}`}}>
      <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 80% 20%,${color}10,transparent 60%)`,pointerEvents:'none'}}/>
      <div style={{fontSize:9,letterSpacing:'2px',color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',marginBottom:7}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color,letterSpacing:'-0.5px',marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(value)}</div>
      <div style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{sub}</div>
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const c = {success:'#10b981',error:'#f43f5e',loading:'#6366f1',info:'#3b82f6'}[type] || '#6366f1'
  return (
    <div style={{position:'fixed',bottom:24,right:24,background:'rgba(10,14,26,0.97)',border:`1px solid ${c}44`,borderRadius:12,padding:'12px 18px',color:'#e2e8f0',fontSize:13,fontWeight:600,zIndex:9999,boxShadow:`0 8px 32px ${c}22`,backdropFilter:'blur(20px)',display:'flex',alignItems:'center',gap:10,animation:'fadeUp .3s ease',fontFamily:"'Outfit',sans-serif"}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0,boxShadow:`0 0 8px ${c}`}}/>
      {msg}
    </div>
  )
}

function ThemeToggle({ mode, setMode, isDark, T }) {
  return (
    <div style={{display:'flex',gap:4,background:T.input,borderRadius:10,padding:3,border:`1px solid ${T.inputBorder}`}}>
      {[['dark','🌙'],['light','☀️'],['system','💻']].map(([m,ic]) => (
        <button key={m} onClick={() => setMode(m)}
          style={{padding:'5px 8px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,background:mode===m?(isDark?'rgba(99,102,241,0.3)':'rgba(99,102,241,0.15)'):'transparent',transition:'background .2s',fontFamily:'inherit'}}>
          {ic}
        </button>
      ))}
    </div>
  )
}

function MobileNav({ tab, setTab, T }) {
  return (
    <div style={{position:'fixed',bottom:0,left:0,right:0,background:T.sidebar,borderTop:`1px solid ${T.border}`,display:'flex',zIndex:100,paddingBottom:'env(safe-area-inset-bottom)'}}>
      {[['overview','📊','Início'],['expenses','💳','Despesas'],['charts','📈','Gráficos'],['history','🗂','Histórico'],['privacy','🔒','Privac.']].map(([k,ic,lb]) => (
        <button key={k} onClick={() => setTab(k)}
          style={{flex:1,padding:'10px 0 12px',border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:tab===k?'#818cf8':T.textMuted,transition:'color .15s',fontFamily:'inherit'}}>
          <span style={{fontSize:18,lineHeight:1}}>{ic}</span>
          <span style={{fontSize:9,fontWeight:tab===k?700:400,letterSpacing:'0.5px'}}>{lb}</span>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// ALERT BANNER
// ─────────────────────────────────────────────
function AlertBanner({ expenses, month, onGoToExpenses, T, isDark }) {
  const [dismissed, setDismissed] = useState(false)
  const isCurrentMonth = month === curMonth()
  const pendingList = expenses.filter(e => !e.paid)
  const allPaid = expenses.length > 0 && pendingList.length === 0
  if (dismissed || expenses.length === 0) return null
  if (isCurrentMonth && pendingList.length > 0) {
    const urgency = pendingList.length >= 5 || pendingList.reduce((s,e) => s+Number(e.value),0) > 1000 ? 'high' : 'medium'
    const color  = urgency==='high' ? '#f43f5e' : '#f59e0b'
    const bg     = urgency==='high' ? (isDark?'rgba(244,63,94,0.08)':'rgba(244,63,94,0.05)') : (isDark?'rgba(245,158,11,0.08)':'rgba(245,158,11,0.05)')
    const border = urgency==='high' ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)'
    return (
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12,animation:'fadeUp .3s ease'}}>
        <div style={{fontSize:22,flexShrink:0}}>{urgency==='high'?'🚨':'⚠️'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:800,color,marginBottom:2}}>{pendingList.length} {pendingList.length===1?'despesa pendente':'despesas pendentes'} este mês</div>
          <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>
            Falta pagar <strong style={{color}}>{pendingList.reduce((s,e)=>s+Number(e.value),0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
          </div>
        </div>
        <button onClick={onGoToExpenses} style={{background:color+'22',border:`1px solid ${color}44`,borderRadius:8,color,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>Ver →</button>
        <button onClick={() => setDismissed(true)} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:16,padding:'0 2px',flexShrink:0}}>✕</button>
      </div>
    )
  }
  if (isCurrentMonth && allPaid) {
    return (
      <div style={{background:isDark?'rgba(16,185,129,0.08)':'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:14,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:22}}>🎉</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:'#10b981',marginBottom:2}}>Tudo pago este mês!</div>
          <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>Parabéns, você está em dia com todas as despesas.</div>
        </div>
        <button onClick={() => setDismissed(true)} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:16,padding:'0 2px'}}>✕</button>
      </div>
    )
  }
  return null
}

// ─────────────────────────────────────────────
// EDIT EXPENSE MODAL
// ─────────────────────────────────────────────
function EditModal({ expense, onSave, onClose, T }) {
  const [form, setForm] = useState({ name:expense.name, value:String(expense.value), category:expense.category })
  const [loading, setLoading] = useState(false)
  const inp = {width:'100%',background:T.input,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,padding:'10px 13px',fontSize:13,fontFamily:"'Outfit',sans-serif",outline:'none'}
  const handleSave = async () => {
    if (!form.name.trim() || !form.value) return
    setLoading(true)
    await onSave(expense.id, { name:form.name.trim(), value:parseFloat(form.value), category:form.category })
    setLoading(false)
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:'28px',width:'100%',maxWidth:420,boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:20}}>Editar Despesa</div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>DESCRIÇÃO</div>
          <input style={inp} value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))}/>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>VALOR (R$)</div>
          <input style={inp} type="number" value={form.value} onChange={e => setForm(p => ({...p,value:e.target.value}))}/>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>CATEGORIA</div>
          <select style={{...inp,cursor:'pointer'}} value={form.category} onChange={e => setForm(p => ({...p,category:e.target.value}))}>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,background:'transparent',border:`1px solid ${T.border}`,borderRadius:12,color:T.textMuted,padding:'11px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={handleSave} disabled={loading}
            style={{flex:2,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:12,color:'#fff',padding:'11px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(99,102,241,0.3)'}}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────
function DeleteModal({ expense, onConfirm, onClose, T }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div style={{background:T.bgCard,border:'1px solid rgba(244,63,94,0.3)',borderRadius:20,padding:'28px',width:'100%',maxWidth:380,boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:28,marginBottom:12,textAlign:'center'}}>🗑️</div>
        <div style={{fontSize:16,fontWeight:800,marginBottom:8,textAlign:'center'}}>Excluir despesa?</div>
        <div style={{fontSize:12,color:T.textMuted,textAlign:'center',marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>{expense.name}</div>
        <div style={{fontSize:14,fontWeight:800,color:'#f43f5e',textAlign:'center',marginBottom:20,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(expense.value)}</div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,background:'transparent',border:`1px solid ${T.border}`,borderRadius:12,color:T.textMuted,padding:'11px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={onConfirm} style={{flex:1,background:'linear-gradient(135deg,#f43f5e,#e11d48)',border:'none',borderRadius:12,color:'#fff',padding:'11px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(244,63,94,0.3)'}}>Excluir ✕</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// INCOME PANEL — totalmente livre
// ─────────────────────────────────────────────
function IncomePanel({ incomeItems, onSave, onClose, T, isDark }) {
  const [items, setItems] = useState(
    incomeItems.length > 0
      ? incomeItems.map(i => ({...i}))
      : [{ id: Date.now(), label: 'Salário', value: '' }]
  )
  const addItem    = () => setItems(prev => [...prev, { id:Date.now(), label:'', value:'' }])
  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id, field, val) => setItems(prev => prev.map(i => i.id===id ? {...i,[field]:val} : i))
  const inp = {background:T.input,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,padding:'8px 11px',fontSize:12,fontFamily:'inherit',outline:'none'}
  return (
    <div style={{background:isDark?'rgba(16,185,129,0.05)':'rgba(16,185,129,0.04)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:16,padding:'18px',marginBottom:18}}>
      <div style={{fontSize:9,letterSpacing:'2px',color:'#10b981',fontFamily:"'JetBrains Mono',monospace",marginBottom:14}}>RECEITAS DO MÊS</div>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
        {items.map(item => (
          <div key={item.id} style={{display:'flex',gap:8,alignItems:'center'}}>
            <input style={{...inp,flex:2}} placeholder="Ex: Salário, Freelance..." value={item.label} onChange={e => updateItem(item.id,'label',e.target.value)}/>
            <input style={{...inp,flex:1}} type="number" placeholder="R$ 0,00" value={item.value} onChange={e => updateItem(item.id,'value',e.target.value)}/>
            <button onClick={() => removeItem(item.id)} style={{background:'rgba(244,63,94,0.1)',border:'none',borderRadius:8,color:'#f43f5e',cursor:'pointer',padding:'8px 10px',fontSize:12,flexShrink:0}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button onClick={addItem} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,color:T.textMuted,padding:'8px 14px',fontSize:11,cursor:'pointer',fontFamily:'inherit',flex:1,minWidth:120}}>+ Adicionar fonte</button>
        <button onClick={() => onSave(items)} style={{background:'linear-gradient(135deg,#10b981,#059669)',border:'none',borderRadius:10,color:'#fff',padding:'8px 18px',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(16,185,129,0.3)',flex:1,minWidth:100}}>Salvar ✓</button>
        <button onClick={onClose} style={{background:'transparent',border:`1px solid ${T.border}`,borderRadius:10,color:T.textMuted,padding:'8px 14px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Fechar</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────
export default function Dashboard({ user }) {
  const { mode, setMode, isDark, T } = useTheme()
  const isMobile = useIsMobile()

  const [tab, setTab]                   = useState('overview')
  const [expenses, setExpenses]         = useState([])
  const [history, setHistory]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState({ msg:'', type:'info' })
  const [filterCat, setFilterCat]       = useState('Todos')
  const [searchText, setSearchText]     = useState('')
  const [showAdd, setShowAdd]           = useState(false)
  const [showIncome, setShowIncome]     = useState(false)
  const [editingExpense, setEditingExpense]   = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [month, setMonth]               = useState(curMonth)
  const [incomeItems, setIncomeItems]   = useState([])
  const [newE, setNewE]                 = useState({ name:'', value:'', category:'Cartão', parcelas:'1' })

  const totalIncome = incomeItems.reduce((s,i) => s+(parseFloat(i.value)||0), 0)
  const monthOptions = buildMonthOptions()
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'

  const notify = (msg, type='info', ms=2800) => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg:'', type:'info' }), ms)
  }

  // ── LOADERS ──────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('despesas').select('*')
      .eq('user_id', user.id).eq('month', month)
      .order('created_at', { ascending:false })
    if (!error) setExpenses(data || [])
    else notify('Erro ao carregar despesas','error')
    setLoading(false)
  }, [user.id, month])

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('despesas').select('month,value,paid').eq('user_id', user.id)
    if (!data) return
    const byMonth = {}
    data.forEach(e => {
      if (!byMonth[e.month]) byMonth[e.month] = { total:0, paid:0, count:0 }
      byMonth[e.month].total += Number(e.value)
      if (e.paid) byMonth[e.month].paid += Number(e.value)
      byMonth[e.month].count++
    })
    const sorted = Object.entries(byMonth)
      .map(([m,d]) => ({ month:m, label:monthLabel(m), income:totalIncome, ...d }))
      .sort((a,b) => a.month.localeCompare(b.month))
    setHistory(sorted)
  }, [user.id, totalIncome])

  // Receitas salvas como JSON na coluna income_items
  // Compatível com schema antigo (salary/vtvr/commission)
  const loadIncome = useCallback(async () => {
    const { data } = await supabase
      .from('receitas').select('*').eq('user_id', user.id).eq('month', month).single()
    if (data) {
      if (data.income_items) {
        try { setIncomeItems(JSON.parse(data.income_items)) } catch { setIncomeItems([]) }
      } else {
        // fallback schema antigo
        const legacy = []
        if (data.salary)     legacy.push({ id:1, label:'Salário',  value:String(data.salary) })
        if (data.vtvr)       legacy.push({ id:2, label:'VT + VR',  value:String(data.vtvr) })
        if (data.commission) legacy.push({ id:3, label:'Comissão', value:String(data.commission) })
        setIncomeItems(legacy)
      }
    } else {
      setIncomeItems([])
    }
  }, [user.id, month])

  useEffect(() => {
    loadExpenses(); loadHistory(); loadIncome()
  }, [loadExpenses, loadHistory, loadIncome])

  // ── ACTIONS ──────────────────────────────────
  const togglePaid = async (id, cur) => {
    setExpenses(prev => prev.map(e => e.id===id ? {...e,paid:!cur} : e))
    const { error } = await supabase.from('despesas').update({ paid:!cur }).eq('id',id).eq('user_id',user.id)
    if (error) { setExpenses(prev => prev.map(e => e.id===id ? {...e,paid:cur} : e)); notify('Erro ao atualizar','error'); return }
    notify(!cur ? '✓ Marcado como pago' : 'Desmarcado','success')
    loadHistory()
  }

  const addExpense = async () => {
    if (!newE.name.trim() || !newE.value || isNaN(parseFloat(newE.value))) { notify('Preencha nome e valor','error'); return }
    const parcelas     = Math.max(1, Math.min(60, parseInt(newE.parcelas)||1))
    const valorParcela = parseFloat(newE.value)
    const nomeParcela  = newE.name.toUpperCase().trim()
    if (parcelas === 1) {
      notify('Salvando...','loading',1500)
      const { data, error } = await supabase.from('despesas')
        .insert({ user_id:user.id, name:nomeParcela, value:valorParcela, paid:false, category:newE.category, month, parcela_atual:null, parcelas_total:null, parcela_grupo:null })
        .select().single()
      if (error) { notify('Erro ao adicionar','error'); return }
      setExpenses(prev => [data,...prev])
    } else {
      notify(`Criando ${parcelas} parcelas...`,'loading',2500)
      const grupo = `${nomeParcela}_${Date.now()}`
      const rows  = []
      const [mesAtual, anoAtual] = month.split('/').map(Number)
      for (let i = 0; i < parcelas; i++) {
        const d = new Date(anoAtual, mesAtual-1+i, 1)
        const m = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
        rows.push({ user_id:user.id, name:`${nomeParcela} (${i+1}/${parcelas})`, value:valorParcela, paid:false, category:newE.category, month:m, parcela_atual:i+1, parcelas_total:parcelas, parcela_grupo:grupo })
      }
      const { error } = await supabase.from('despesas').insert(rows)
      if (error) { notify('Erro ao criar parcelas','error'); return }
      notify(`${parcelas} parcelas criadas!','success`)
    }
    setNewE({ name:'', value:'', category:'Cartão', parcelas:'1' }); setShowAdd(false)
    loadExpenses(); loadHistory()
  }

  const editExpense = async (id, payload) => {
    const { error } = await supabase.from('despesas').update(payload).eq('id',id).eq('user_id',user.id)
    if (error) { notify('Erro ao editar','error'); return }
    setExpenses(prev => prev.map(e => e.id===id ? {...e,...payload} : e))
    setEditingExpense(null)
    notify('Despesa atualizada!','success')
  }

  const removeExpense = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    const { error } = await supabase.from('despesas').delete().eq('id',id).eq('user_id',user.id)
    if (error) { notify('Erro ao remover','error'); loadExpenses(); return }
    notify('Despesa removida','success'); loadHistory()
    setDeletingExpense(null)
  }

  const saveIncome = async (items) => {
    const clean = items
      .filter(i => i.label.trim() && parseFloat(i.value) > 0)
      .map(i => ({ id:i.id, label:i.label.trim(), value:String(parseFloat(i.value)||0) }))
    const payload = { income_items: JSON.stringify(clean) }
    const { data:existing } = await supabase.from('receitas').select('id').eq('user_id',user.id).eq('month',month).single()
    const res = existing
      ? await supabase.from('receitas').update(payload).eq('user_id',user.id).eq('month',month)
      : await supabase.from('receitas').insert({ user_id:user.id, month, ...payload })
    if (res.error) { notify('Erro ao salvar: '+res.error.message,'error'); return }
    setIncomeItems(clean); notify('Receitas salvas!','success'); setShowIncome(false); loadHistory()
  }

  const signOut = async () => { await supabase.auth.signOut() }

  const deleteAccount = async () => {
    if (!window.confirm('Tem certeza? Todos os seus dados serão apagados permanentemente.')) return
    if (!window.confirm('Última confirmação: apagar minha conta e todos os dados?')) return
    notify('Excluindo conta...','loading',8000)
    try {
      await supabase.from('despesas').delete().eq('user_id',user.id)
      await supabase.from('receitas').delete().eq('user_id',user.id)
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error
      notify('Conta excluída!','success')
      setTimeout(() => supabase.auth.signOut(), 1500)
    } catch(e) {
      console.error('Delete error:',e)
      notify('Erro ao excluir. Tente novamente.','error')
    }
  }

  // ── PDF EXPORT ────────────────────────────────
  const exportPDF = async () => {
    notify('Gerando PDF...','loading',5000)
    try {
      await new Promise((res,rej) => {
        if (window.jspdf) { res(); return }
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload = res; s.onerror = rej; document.head.appendChild(s)
      })
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
      const W = 210, pad = 16
      const monName     = monthLabel(month)
      const paidList    = expenses.filter(e => e.paid)
      const pendingList = expenses.filter(e => !e.paid)
      const totalPaid   = paidList.reduce((s,e) => s+Number(e.value), 0)
      const totalPend   = pendingList.reduce((s,e) => s+Number(e.value), 0)
      const pct         = total > 0 ? (totalPaid/total)*100 : 0
      const fmtV = v => 'R$ ' + Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
      const catBreakdown = CATS.map(cat => ({
        name:cat, color:CAT_COLORS[cat],
        value: expenses.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.value),0),
        paid:  expenses.filter(e=>e.category===cat&&e.paid).reduce((s,e)=>s+Number(e.value),0),
        count: expenses.filter(e=>e.category===cat).length
      })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)
      const maxCat = catBreakdown.length > 0 ? catBreakdown[0].value : 1
      const rgb  = hex => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]
      const fill = hex => { const [r,g,b]=rgb(hex); doc.setFillColor(r,g,b) }
      const draw = hex => { const [r,g,b]=rgb(hex); doc.setDrawColor(r,g,b) }
      const txt  = hex => { const [r,g,b]=rgb(hex); doc.setTextColor(r,g,b) }
      const box  = (x,y,w,h,f,d) => { if(w<=0||h<=0)return; if(f)fill(f); if(d)draw(d); doc.rect(x,y,w,h,f&&d?'FD':f?'F':d?'D':'N') }

      const stripes=['#4338ca','#4740cd','#4b48d0','#5050d3','#5458d6','#5860d9','#5c68dc','#6070df','#6478e2','#6880e5','#6c84e7','#7088e9']
      stripes.forEach((c,i)=>{ fill(c); doc.rect(0,i*(42/stripes.length),W,(42/stripes.length)+0.5,'F') })
      box(pad,8,14,14,'#6366f1',null)
      doc.setFontSize(10); doc.setFont('helvetica','bold'); txt('#ffffff'); doc.text('F',pad+7,17,{align:'center'})
      doc.setFontSize(16); txt('#ffffff'); doc.text('Finly',pad+18,16)
      doc.setFontSize(6);  doc.setFont('helvetica','normal'); txt('#ffffffaa'); doc.text('PERSONAL FINANCE',pad+18,21)
      doc.setFontSize(22); doc.setFont('helvetica','bold'); txt('#ffffff'); doc.text(monName,W-pad,17,{align:'right'})
      doc.setFontSize(6.5); doc.setFont('helvetica','normal'); txt('#ffffffbb'); doc.text('RELATÓRIO MENSAL',W-pad,23,{align:'right'}); doc.text(user.email,W-pad,28,{align:'right'})
      draw('#ffffff'); doc.setLineWidth(0.3); doc.setGState(new doc.GState({opacity:0.2})); doc.line(pad,37,W-pad,37); doc.setGState(new doc.GState({opacity:1}))

      let y = 46
      const cards=[
        {label:'RECEITAS',val:fmtV(totalIncome),sub:'total de receitas',bg:'#f0fdf4',ac:'#10b981'},
        {label:'DESPESAS',val:fmtV(total),sub:expenses.length+' lançamentos',bg:'#fef2f2',ac:'#f43f5e'},
        {label:'PENDENTE',val:fmtV(totalPend),sub:pendingList.length+' não pagas',bg:'#fffbeb',ac:'#f59e0b'},
        {label:'SALDO',val:fmtV(Math.abs(balance)),sub:balance>=0?'disponível':'⚠ déficit',bg:balance>=0?'#f0f9ff':'#fef2f2',ac:balance>=0?'#6366f1':'#f43f5e'},
      ]
      const cw=(W-pad*2-9)/4
      cards.forEach((c,i)=>{
        const cx=pad+i*(cw+3); box(cx,y,cw,22,c.bg,null)
        const [ar,ag,ab]=rgb(c.ac); doc.setFillColor(ar,ag,ab); doc.rect(cx,y,1.5,22,'F')
        doc.setFontSize(5.5); doc.setFont('helvetica','bold'); txt(c.ac); doc.text(c.label,cx+4,y+5.5)
        doc.setFontSize(8.5); txt(c.ac); doc.text(c.val,cx+4,y+12.5,{maxWidth:cw-5})
        doc.setFontSize(5); doc.setFont('helvetica','normal'); txt('#94a3b8'); doc.text(c.sub,cx+4,y+18.5)
      })
      y+=27
      if (expenses.length>0) {
        box(pad,y,W-pad*2,18,'#f8f9ff','#e8eaf6')
        doc.setFillColor(99,102,241); doc.circle(pad+11,y+9,7,'F')
        doc.setFontSize(7); doc.setFont('helvetica','bold'); txt('#ffffff'); doc.text(Math.round(pct)+'%',pad+11,y+9.5,{align:'center'})
        doc.setFontSize(9.5); txt('#0f172a'); doc.text('Progresso de Pagamentos',pad+22,y+6.5)
        doc.setFontSize(6.5); doc.setFont('helvetica','normal'); txt('#64748b'); doc.text(paidList.length+' de '+expenses.length+' despesas pagas',pad+22,y+11)
        box(pad+22,y+13,W-pad*2-26,3,'#e2e8f0',null)
        if(pct>0){const pw=Math.max(1,(W-pad*2-26)*(pct/100));doc.setFillColor(99,102,241);doc.rect(pad+22,y+13,pw,3,'F')}
        doc.setFontSize(6); doc.setFont('helvetica','bold')
        txt('#10b981'); doc.text('Pago: '+fmtV(totalPaid),pad+22,y+19)
        txt('#f43f5e'); doc.text('Pendente: '+fmtV(totalPend),W-pad,y+19,{align:'right'})
        y+=23
      }
      const colW=(W-pad*2-5)/2, c1=pad, c2=pad+colW+5
      const catH=Math.max(catBreakdown.length*13+16,40)
      box(c1,y,colW,catH,'#ffffff','#e2e8f0')
      doc.setFontSize(5.5); doc.setFont('helvetica','bold'); txt('#94a3b8'); doc.text('DESPESAS POR CATEGORIA',c1+4,y+6)
      draw('#f1f5f9'); doc.setLineWidth(0.2); doc.line(c1+4,y+8,c1+colW-4,y+8)
      let yc=y+13
      catBreakdown.forEach(cat=>{
        const [cr,cg,cb]=rgb(cat.color); doc.setTextColor(cr,cg,cb)
        doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.text(cat.name,c1+4,yc)
        txt('#0f172a'); doc.text(fmtV(cat.value),c1+colW-4,yc,{align:'right'})
        box(c1+4,yc+1.5,colW-8,2.5,'#f1f5f9',null)
        if(cat.value>0){const bw=Math.max(1,(colW-8)*(cat.value/maxCat));doc.setFillColor(cr,cg,cb);doc.rect(c1+4,yc+1.5,bw,2.5,'F')}
        doc.setFontSize(5); doc.setFont('helvetica','normal'); txt('#94a3b8')
        doc.text(cat.count+' itens · '+(cat.value>0?Math.round((cat.paid/cat.value)*100):0)+'% pago',c1+4,yc+6.5)
        yc+=13
      })
      box(c2,y,colW,catH,'#ffffff','#e2e8f0')
      doc.setFontSize(5.5); doc.setFont('helvetica','bold'); txt('#94a3b8'); doc.text('COMPOSIÇÃO DAS RECEITAS',c2+4,y+6)
      draw('#f1f5f9'); doc.line(c2+4,y+8,c2+colW-4,y+8)
      let yi=y+13
      incomeItems.forEach((item,idx)=>{
        const c=INCOME_COLORS[idx%INCOME_COLORS.length], v=parseFloat(item.value)||0
        const [ir,ig,ib]=rgb(c)
        doc.setFontSize(7); doc.setFont('helvetica','normal'); txt('#64748b'); doc.text(item.label,c2+4,yi)
        doc.setTextColor(ir,ig,ib); doc.setFont('helvetica','bold'); doc.text(fmtV(v),c2+colW-4,yi,{align:'right'})
        box(c2+4,yi+1.5,colW-8,2.5,'#f1f5f9',null)
        if(v>0&&totalIncome>0){const iw=Math.max(1,(colW-8)*(v/totalIncome));doc.setFillColor(ir,ig,ib);doc.rect(c2+4,yi+1.5,iw,2.5,'F')}
        yi+=11
      })
      draw('#f1f5f9'); doc.line(c2+4,yi+1,c2+colW-4,yi+1)
      doc.setFontSize(7); doc.setFont('helvetica','bold'); txt('#94a3b8'); doc.text('TOTAL',c2+4,yi+5.5)
      txt('#10b981'); doc.text(fmtV(totalIncome),c2+colW-4,yi+5.5,{align:'right'})
      y+=catH+8
      if(y+expenses.length*9+20>270){doc.addPage();y=16}
      const tableH=expenses.length*9+20
      box(pad,y,W-pad*2,tableH,'#ffffff','#e2e8f0')
      doc.setFontSize(5.5); doc.setFont('helvetica','bold'); txt('#94a3b8'); doc.text('DETALHAMENTO DE DESPESAS',pad+4,y+6)
      draw('#f1f5f9'); doc.line(pad+4,y+8,W-pad-4,y+8)
      const cols={name:pad+4,cat:pad+80,val:W-pad-28,status:W-pad-4}
      doc.setFontSize(5); doc.setFont('helvetica','bold'); txt('#94a3b8')
      doc.text('DESCRIÇÃO',cols.name,y+12); doc.text('CATEGORIA',cols.cat,y+12); doc.text('VALOR',cols.val,y+12,{align:'right'}); doc.text('STATUS',cols.status,y+12,{align:'right'})
      let yt=y+17
      expenses.forEach(e=>{
        const [cr,cg,cb]=rgb(CAT_COLORS[e.category]||'#94a3b8')
        doc.setFontSize(6.5); doc.setFont('helvetica',e.paid?'normal':'bold')
        txt(e.paid?'#64748b':'#0f172a'); doc.text(e.name.length>38?e.name.slice(0,36)+'…':e.name,cols.name,yt)
        doc.setTextColor(cr,cg,cb); doc.setFont('helvetica','normal'); doc.text(e.category,cols.cat,yt)
        txt(e.paid?'#10b981':'#f43f5e'); doc.setFont('helvetica','bold'); doc.text(fmtV(e.value),cols.val,yt,{align:'right'}); doc.text(e.paid?'PAGO':'PENDENTE',cols.status,yt,{align:'right'})
        yt+=9
      })
      const totalPages=doc.getNumberOfPages()
      for(let p=1;p<=totalPages;p++){
        doc.setPage(p); draw('#e2e8f0'); doc.setLineWidth(0.3); doc.line(pad,287,W-pad,287)
        doc.setFontSize(6); doc.setFont('helvetica','bold'); txt('#6366f1'); doc.text('Finly',pad,292)
        doc.setFont('helvetica','normal'); txt('#94a3b8')
        doc.text('finly.api.br · '+new Date().toLocaleDateString('pt-BR'),W/2,292,{align:'center'})
        doc.text('Página '+p+' de '+totalPages,W-pad,292,{align:'right'})
      }
      doc.save('Finly-'+monName.replace('/','_')+'.pdf')
      notify('PDF baixado! ✓','success')
    } catch(err) {
      console.error('PDF Error:',err); notify('Erro ao gerar PDF: '+err.message,'error')
    }
  }

  // ── COMPUTEDS ────────────────────────────────
  const total    = expenses.reduce((s,e) => s+Number(e.value), 0)
  const paid     = expenses.filter(e=>e.paid).reduce((s,e) => s+Number(e.value), 0)
  const pending  = total - paid
  const balance  = totalIncome - total
  const pct      = total > 0 ? (paid/total)*100 : 0
  const filtered = expenses
    .filter(e => filterCat==='Todos' || e.category===filterCat)
    .filter(e => !searchText || e.name.toLowerCase().includes(searchText.toLowerCase()))
  const catData = CATS.map(cat => ({
    name:cat, color:CAT_COLORS[cat],
    value:   expenses.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.value),0),
    paidVal: expenses.filter(e=>e.category===cat&&e.paid).reduce((s,e)=>s+Number(e.value),0),
    count:   expenses.filter(e=>e.category===cat).length
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)
  const top5 = [...expenses].sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,5)

  // ── STYLES ───────────────────────────────────
  const G = {
    app:    { minHeight:'100vh', background:T.bg, color:T.text, fontFamily:"'Outfit',sans-serif", display:'flex', transition:'background .3s,color .3s' },
    sidebar:{ width:214, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', flexShrink:0, transition:'background .3s' },
    main:   { flex:1, padding:isMobile?'16px 14px 80px':'28px 32px', overflowY:'auto', minHeight:'100vh' },
    nav:    (a) => ({ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', cursor:'pointer', fontSize:12, fontWeight:600, color:a?'#818cf8':T.textMuted, borderLeft:`3px solid ${a?'#6366f1':'transparent'}`, background:a?(isDark?'rgba(99,102,241,0.1)':'rgba(99,102,241,0.07)'):'transparent', transition:'all .15s' }),
    cards:  { display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:isMobile?10:14, marginBottom:18 },
    sec:    (b) => ({ background:T.bgCard, border:`1px solid ${b||T.border}`, borderRadius:16, padding:isMobile?'14px':'20px', marginBottom:16, transition:'background .3s' }),
    lbl:    { fontSize:9, letterSpacing:'2px', color:T.textMuted, fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase', marginBottom:12 },
    row:    { display:'flex', flexDirection:isMobile?'column':'row', gap:14, marginBottom:16 },
    expRow: (p) => ({ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:12, cursor:'pointer', marginBottom:7, transition:'all .15s', background:p?T.expPaid:T.expPending, border:`1px solid ${p?T.expPaidBorder:T.expPendingBorder}` }),
    pill:   (c) => ({ background:c+'22', color:c, border:`1px solid ${c}44`, padding:'2px 7px', borderRadius:20, fontSize:9, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' }),
    inp:    { background:T.input, border:`1px solid ${T.inputBorder}`, borderRadius:10, color:T.text, padding:'10px 13px', fontSize:12, fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box', transition:'border-color .2s' },
    btn:    (bg) => ({ background:bg, border:'none', borderRadius:10, color:'#fff', padding:'9px 16px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }),
    fBtn:   (a,c) => ({ background:a?(c||'#6366f1')+'20':'transparent', border:`1px solid ${a?(c||'#6366f1')+'55':T.border}`, borderRadius:8, color:a?(c||'#818cf8'):T.textMuted, padding:'5px 11px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }),
  }

  const TABS = [['overview','⊞','Visão Geral'],['expenses','≡','Despesas'],['charts','◉','Gráficos'],['history','◷','Histórico']]

  return (
    <div style={G.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(99,102,241,0.5)}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        select option{background:${isDark?'#080c18':'#fff'};color:${T.text}}
        input:focus,select:focus{border-color:rgba(99,102,241,0.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.12)!important}
        button:active{transform:scale(0.97)}
      `}</style>

      {/* ── SIDEBAR ── */}
      {!isMobile && (
        <nav style={G.sidebar}>
          <div style={{padding:'20px 16px 14px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#6366f1,#818cf8)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 16px rgba(99,102,241,0.5)',overflow:'hidden',position:'relative'}}>
                  <span style={{fontSize:15,fontWeight:900,color:'#fff',fontFamily:"'Outfit',sans-serif"}}>F</span>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.12))',pointerEvents:'none'}}/>
                </div>
                <div style={{fontSize:18,fontWeight:900,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#e2e8f0,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Finly</div>
              </div>
              <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'2px'}}>PERSONAL FINANCE ✦</div>
            </div>
            <ThemeToggle mode={mode} setMode={setMode} isDark={isDark} T={T}/>
          </div>
          <div style={{padding:'12px 14px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:9,letterSpacing:'1.5px',color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>MÊS</div>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{...G.inp,padding:'7px 10px',fontSize:11}}>
              {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div style={{fontSize:9,letterSpacing:'2px',color:T.textFaint,padding:'12px 18px 4px',fontFamily:"'JetBrains Mono',monospace"}}>NAVEGAÇÃO</div>
          {TABS.map(([k,ic,lb]) => (
            <div key={k} style={G.nav(tab===k)} onClick={() => setTab(k)}>
              <span style={{fontSize:14,opacity:tab===k?1:0.45}}>{ic}</span> {lb}
            </div>
          ))}
          <div style={{marginTop:'auto',padding:'12px',borderTop:`1px solid ${T.border}`}}>
            <div style={{background:balance>=0?(isDark?'rgba(16,185,129,0.1)':'rgba(16,185,129,0.08)'):(isDark?'rgba(244,63,94,0.1)':'rgba(244,63,94,0.06)'),border:`1px solid ${balance>=0?'rgba(16,185,129,0.3)':'rgba(244,63,94,0.3)'}`,borderRadius:10,padding:'9px 12px',marginBottom:10}}>
              <div style={{fontSize:9,color:balance>=0?'#6ee7b7':'#fda4af',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{balance>=0?'✓ NO AZUL':'⚠ DÉFICIT'}</div>
              <div style={{fontSize:15,fontWeight:800,color:balance>=0?'#10b981':'#f43f5e',fontFamily:"'JetBrains Mono',monospace"}}>{balance>=0?'':'-'}{fmt(Math.abs(balance))}</div>
            </div>
            <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,padding:'8px 11px',marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userName}</div>
              <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.email}</div>
            </div>
            <button onClick={signOut} style={{...G.btn('transparent'),color:'#f43f5e',width:'100%',fontSize:11,border:'1px solid rgba(244,63,94,0.25)',padding:'8px',marginBottom:4}}>Sair →</button>
            <button onClick={deleteAccount} style={{...G.btn('transparent'),color:T.textMuted,width:'100%',fontSize:10,border:'1px solid '+T.border,padding:'6px',opacity:0.6}}>Excluir conta</button>
          </div>
        </nav>
      )}

      {/* ── MOBILE HEADER ── */}
      {isMobile && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:200,background:isDark?'rgba(8,11,22,0.98)':'rgba(248,250,255,0.99)',borderBottom:`1px solid ${T.border}`,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',backdropFilter:'blur(20px)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#818cf8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 10px rgba(99,102,241,0.4)'}}>
              <span style={{fontSize:14,fontWeight:900,color:'#fff',fontFamily:"'Outfit',sans-serif"}}>F</span>
            </div>
            <div style={{fontSize:15,fontWeight:900,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#e2e8f0,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Finly</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <select value={month} onChange={e => setMonth(e.target.value)}
              style={{background:T.input,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:'5px 8px',fontSize:11,fontFamily:'inherit',outline:'none'}}>
              {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            <ThemeToggle mode={mode} setMode={setMode} isDark={isDark} T={T}/>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main style={{...G.main,paddingTop:isMobile?'74px':'28px'}}>

        {/* ════ OVERVIEW ════ */}
        {tab==='overview' && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:'-1px',marginBottom:3}}>Olá, {userName.split(' ')[0]} 👋</div>
                <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{monthLabel(month)} · {expenses.length} despesas</div>
              </div>
              <button onClick={() => setShowIncome(v=>!v)}
                style={{...G.btn(showIncome?'rgba(244,63,94,0.18)':'rgba(16,185,129,0.18)'),color:showIncome?'#f43f5e':'#10b981',border:`1px solid ${showIncome?'rgba(244,63,94,0.3)':'rgba(16,185,129,0.3)'}`,fontSize:isMobile?11:12}}>
                {showIncome?'✕ Fechar':'✏ Receitas'}
              </button>
            </div>

            <AlertBanner expenses={expenses} month={month} onGoToExpenses={() => setTab('expenses')} T={T} isDark={isDark}/>

            {showIncome && (
              <IncomePanel incomeItems={incomeItems} onSave={saveIncome} onClose={() => setShowIncome(false)} T={T} isDark={isDark}/>
            )}

            {loading ? (
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'60px 0',color:T.textMuted,fontSize:13,justifyContent:'center'}}>
                <div style={{width:18,height:18,border:`2px solid ${T.border}`,borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                Carregando...
              </div>
            ) : (
              <>
                <div style={G.cards}>
                  <StatCard label="Receitas"    value={totalIncome}        color="#10b981" borderColor="rgba(16,185,129,0.2)"  sub="total de receitas" T={T}/>
                  <StatCard label="Despesas"    value={total}              color="#f43f5e" borderColor="rgba(244,63,94,0.2)"  sub={`${expenses.length} lançamentos`} T={T}/>
                  <StatCard label="Falta Pagar" value={pending}            color="#f59e0b" borderColor="rgba(245,158,11,0.2)" sub={`${expenses.filter(e=>!e.paid).length} pendentes`} T={T}/>
                  <StatCard label="Saldo Final" value={Math.abs(balance)}  color={balance>=0?'#818cf8':'#f43f5e'} borderColor={balance>=0?'rgba(129,140,248,0.2)':'rgba(244,63,94,0.2)'} sub={balance>=0?'disponível':'déficit'} T={T}/>
                </div>

                <div style={{...G.sec('rgba(99,102,241,0.15)'),display:'flex',alignItems:'center',gap:isMobile?16:24,background:isDark?'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.04))':'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.03))'}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <Ring pct={pct} size={isMobile?76:90} T={T}/>
                    <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
                      <div style={{fontSize:isMobile?13:15,fontWeight:800}}>{Math.round(pct)}%</div>
                      <div style={{fontSize:7,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>PAGO</div>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:isMobile?14:16,fontWeight:800,marginBottom:3}}>Progresso de Pagamentos</div>
                    <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:12}}>{expenses.filter(e=>e.paid).length} de {expenses.length} pagas · {monthLabel(month)}</div>
                    <div style={{background:T.border,borderRadius:99,height:6,overflow:'hidden'}}>
                      <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#6366f1,#818cf8)',borderRadius:99,transition:'width 1s cubic-bezier(.34,1.56,.64,1)',boxShadow:'0 0 10px rgba(99,102,241,0.5)'}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>
                      <span style={{color:'#10b981'}}>✓ {fmt(paid)}</span>
                      <span style={{color:'#f43f5e'}}>⏳ {fmt(pending)}</span>
                    </div>
                  </div>
                </div>

                <div style={G.row}>
                  <div style={{...G.sec(),flex:1,marginBottom:0}}>
                    <div style={G.lbl}>Composição das Receitas</div>
                    {incomeItems.length === 0
                      ? <div style={{color:T.textMuted,fontSize:12,textAlign:'center',padding:'20px 0'}}>Nenhuma receita cadastrada</div>
                      : incomeItems.map((item,idx) => {
                          const c = INCOME_COLORS[idx % INCOME_COLORS.length]
                          const v = parseFloat(item.value)||0
                          return (
                            <div key={item.id} style={{marginBottom:12}}>
                              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11}}>
                                <span style={{color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{item.label.toUpperCase()}</span>
                                <span style={{fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(v)}</span>
                              </div>
                              <div style={{background:T.border,borderRadius:99,height:4}}>
                                <div style={{width:`${totalIncome>0?(v/totalIncome)*100:0}%`,height:'100%',background:c,borderRadius:99,boxShadow:`0 0 6px ${c}66`}}/>
                              </div>
                            </div>
                          )
                        })
                    }
                    <div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${T.border}`,paddingTop:10,fontSize:11}}>
                      <span style={{color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>TOTAL</span>
                      <span style={{fontWeight:800,color:'#10b981',fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalIncome)}</span>
                    </div>
                  </div>
                  {!isMobile && (
                    <div style={{...G.sec(),flex:1,marginBottom:0}}>
                      <div style={G.lbl}>Top 5 Despesas</div>
                      {top5.length===0
                        ? <div style={{color:T.textMuted,fontSize:12,textAlign:'center',padding:'20px 0'}}>Nenhuma despesa ainda</div>
                        : top5.map((e,i) => (
                            <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:11}}>
                              <div style={{width:22,height:22,borderRadius:7,background:CAT_COLORS[e.category]+'22',color:CAT_COLORS[e.category],fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:700,marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.name}</div>
                                <div style={{background:T.border,borderRadius:99,height:3}}>
                                  <div style={{width:`${(Number(e.value)/Number(top5[0].value))*100}%`,height:'100%',background:CAT_COLORS[e.category],borderRadius:99}}/>
                                </div>
                              </div>
                              <div style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{fmt(e.value)}</div>
                            </div>
                          ))
                      }
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ EXPENSES ════ */}
        {tab==='expenses' && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:'-1px',marginBottom:3}}>Despesas</div>
            <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:16}}>{monthLabel(month)} · {expenses.length} registros</div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:12}}>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {['Todos',...CATS].map(c => <button key={c} style={G.fBtn(filterCat===c,CAT_COLORS[c])} onClick={() => setFilterCat(c)}>{c}</button>)}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button style={{...G.fBtn(false),padding:'7px 12px'}} onClick={loadExpenses}>↺</button>
                <button style={{...G.fBtn(false),padding:'7px 12px',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.08)'}} onClick={exportPDF}>{isMobile?'PDF':'↓ PDF'}</button>
                <button style={{...G.btn('linear-gradient(135deg,#6366f1,#8b5cf6)'),boxShadow:'0 4px 14px rgba(99,102,241,0.3)'}} onClick={() => setShowAdd(v=>!v)}>
                  {showAdd?'✕ Cancelar':'+ Adicionar'}
                </button>
              </div>
            </div>

            {showAdd && (
              <div style={{...G.sec('rgba(99,102,241,0.2)'),background:isDark?'rgba(99,102,241,0.06)':'rgba(99,102,241,0.04)',marginBottom:14}}>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'2fr 1fr 1fr 1fr auto',gap:10,marginBottom:parseInt(newE.parcelas)>1?10:0}}>
                  <div style={{gridColumn:isMobile?'1/-1':'auto'}}>
                    <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>DESCRIÇÃO</div>
                    <input style={G.inp} type="text" placeholder="Nome da despesa" value={newE.name} onChange={e=>setNewE(p=>({...p,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addExpense()}/>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>VALOR (R$)</div>
                    <input style={G.inp} type="number" placeholder="0,00" value={newE.value} onChange={e=>setNewE(p=>({...p,value:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>PARCELAS</div>
                    <input style={G.inp} type="number" min="1" max="60" placeholder="1" value={newE.parcelas} onChange={e=>setNewE(p=>({...p,parcelas:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:T.textMuted,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px'}}>CATEGORIA</div>
                    <select style={{...G.inp,cursor:'pointer'}} value={newE.category} onChange={e=>setNewE(p=>({...p,category:e.target.value}))}>
                      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button style={{...G.btn('linear-gradient(135deg,#10b981,#059669)'),alignSelf:'flex-end',whiteSpace:'nowrap',gridColumn:isMobile?'1/-1':'auto',boxShadow:'0 4px 14px rgba(16,185,129,0.3)'}} onClick={addExpense}>
                    {parseInt(newE.parcelas)>1?`Criar ${newE.parcelas}x ✓`:'Salvar ✓'}
                  </button>
                </div>
                {parseInt(newE.parcelas)>1&&newE.value&&(
                  <div style={{background:isDark?'rgba(245,158,11,0.08)':'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'9px 13px',fontSize:11,color:'#f59e0b',display:'flex',alignItems:'center',gap:8}}>
                    <span>📅</span>
                    <span><strong>{newE.parcelas}x</strong> de <strong>R$ {parseFloat(newE.value||0).toFixed(2).replace('.',',')}</strong> — criadas nos próximos {newE.parcelas} meses</span>
                  </div>
                )}
              </div>
            )}

            <div style={G.sec()}>
              {/* Busca + contador */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:10,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:160}}>
                  <span style={{color:T.textMuted,fontSize:13}}>🔍</span>
                  <input style={{...G.inp,padding:'6px 10px',fontSize:12}} placeholder="Buscar despesa..." value={searchText} onChange={e=>setSearchText(e.target.value)}/>
                  {searchText && (
                    <button onClick={() => setSearchText('')} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:14,padding:'0 4px',flexShrink:0}}>✕</button>
                  )}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  <div style={{...G.lbl,marginBottom:0}}>{filtered.length} despesas{filterCat!=='Todos'?` · ${filterCat}`:''}</div>
                  <span style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(filtered.reduce((s,e)=>s+Number(e.value),0))}</span>
                </div>
              </div>

              {loading
                ? <div style={{textAlign:'center',padding:'30px',color:T.textMuted,fontSize:12}}>Carregando...</div>
                : filtered.length===0
                  ? <div style={{textAlign:'center',padding:'40px',color:T.textMuted,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>
                      {searchText ? `Nenhum resultado para "${searchText}"` : `Nenhuma despesa em ${monthLabel(month)}`}
                    </div>
                  : filtered.map(e => (
                      <div key={e.id} style={G.expRow(e.paid)} onClick={() => togglePaid(e.id,e.paid)}>
                        <div style={{width:28,height:28,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,background:e.paid?'rgba(16,185,129,0.15)':'rgba(244,63,94,0.1)',color:e.paid?'#10b981':'#f43f5e',border:`1.5px solid ${e.paid?'rgba(16,185,129,0.4)':'rgba(244,63,94,0.3)'}`,flexShrink:0,transition:'all .2s'}}>
                          {e.paid?'✓':'○'}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.name}</div>
                          <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                            <span style={G.pill(CAT_COLORS[e.category]||'#94a3b8')}>{e.category}</span>
                            {e.parcelas_total>1&&<span style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>📅 {e.parcela_atual}/{e.parcelas_total}</span>}
                          </div>
                        </div>
                        <div style={{fontSize:isMobile?13:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:e.paid?'#10b981':'#f43f5e',flexShrink:0}}>{fmt(e.value)}</div>
                        {!isMobile&&<span style={{...G.pill(e.paid?'#10b981':'#f43f5e'),margin:'0 6px'}}>{e.paid?'PAGO':'PENDENTE'}</span>}
                        <button onClick={ev=>{ev.stopPropagation();setEditingExpense(e)}}
                          style={{background:'rgba(99,102,241,0.1)',border:'none',borderRadius:8,color:'#818cf8',cursor:'pointer',padding:'5px 8px',fontSize:11,flexShrink:0}}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.22)'}
                          onMouseLeave={e=>e.currentTarget.style.background='rgba(99,102,241,0.1)'}>✏</button>
                        <button onClick={ev=>{ev.stopPropagation();setDeletingExpense(e)}}
                          style={{background:'rgba(244,63,94,0.1)',border:'none',borderRadius:8,color:'#f43f5e',cursor:'pointer',padding:'5px 8px',fontSize:11,flexShrink:0}}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(244,63,94,0.22)'}
                          onMouseLeave={e=>e.currentTarget.style.background='rgba(244,63,94,0.1)'}>✕</button>
                      </div>
                    ))
              }
            </div>
          </div>
        )}

        {/* ════ CHARTS ════ */}
        {tab==='charts' && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:'-1px',marginBottom:3}}>Gráficos</div>
            <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:16}}>{monthLabel(month)}</div>
            <div style={G.row}>
              <div style={{...G.sec(),flex:1,marginBottom:0}}>
                <div style={G.lbl}>Despesas por Categoria</div>
                {catData.length===0
                  ? <div style={{textAlign:'center',padding:'40px',color:T.textMuted,fontSize:12}}>Sem dados</div>
                  : <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {catData.map(d => <Cell key={d.name} fill={d.color}/>)}
                          </Pie>
                          <Tooltip content={<CTip isDark={isDark}/>}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:6}}>
                        {catData.map(d => (
                          <div key={d.name} style={{display:'flex',alignItems:'center',gap:4,fontSize:10}}>
                            <div style={{width:7,height:7,borderRadius:2,background:d.color}}/>
                            <span style={{color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{d.name}</span>
                            <span style={{fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                }
              </div>
              <div style={{...G.sec(),flex:1,marginBottom:0}}>
                <div style={G.lbl}>Receita vs Despesa</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[{n:'Receitas',v:totalIncome},{n:'Despesas',v:total},{n:'Pagas',v:paid},{n:'Saldo',v:Math.max(0,balance)}]} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid}/>
                    <XAxis dataKey="n" tick={{fill:T.textMuted,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.textMuted,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                    <Tooltip content={<CTip isDark={isDark}/>} cursor={{fill:isDark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.03)'}}/>
                    <Bar dataKey="v" name="Valor" radius={[6,6,0,0]}>
                      {['#10b981','#f43f5e','#3b82f6','#818cf8'].map((c,i)=><Cell key={i} fill={c} fillOpacity={0.85}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={G.sec()}>
              <div style={G.lbl}>Detalhamento por Categoria</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:10}}>
                {catData.map(d => {
                  const p = d.value>0?(d.paidVal/d.value)*100:0
                  return (
                    <div key={d.name} style={{background:d.color+'12',border:`1px solid ${d.color}28`,borderRadius:12,padding:'12px 13px'}}>
                      <div style={{fontSize:9,fontWeight:700,color:d.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'1px',marginBottom:5}}>{d.name.toUpperCase()}</div>
                      <div style={{fontSize:14,fontWeight:800,marginBottom:6,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{fmt(d.value)}</div>
                      <div style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)',borderRadius:99,height:3}}>
                        <div style={{width:`${p}%`,height:'100%',background:d.color,borderRadius:99,boxShadow:`0 0 6px ${d.color}66`}}/>
                      </div>
                      <div style={{fontSize:9,color:T.textMuted,marginTop:4,fontFamily:"'JetBrains Mono',monospace"}}>{d.count} itens · {Math.round(p)}% pago</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ HISTORY ════ */}
        {tab==='history' && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:'-1px',marginBottom:3}}>Histórico Mensal</div>
            <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:16}}>{history.length} meses registrados</div>
            {history.length>1&&(
              <div style={G.sec()}>
                <div style={G.lbl}>Evolução Receitas vs Despesas</div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid}/>
                    <XAxis dataKey="label" tick={{fill:T.textMuted,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.textMuted,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                    <Tooltip content={<CTip isDark={isDark}/>}/>
                    <Legend formatter={v=><span style={{color:T.textMuted,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>}/>
                    <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#gI)" dot={{fill:'#10b981',r:3}}/>
                    <Area type="monotone" dataKey="total"  name="Despesas" stroke="#f43f5e" strokeWidth={2} fill="url(#gE)" dot={{fill:'#f43f5e',r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16}}>
              {history.length===0
                ? <div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:T.textMuted,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>Histórico aparece conforme você registrar despesas em meses diferentes</div>
                : history.map(h => {
                    const bal=h.income-h.total, p=h.total>0?(h.paid/h.total)*100:0, c=bal>=0?'#10b981':'#f43f5e'
                    return (
                      <div key={h.month} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:14,padding:'13px 14px',transition:'all .2s'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:10,fontWeight:700,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{h.label}</span>
                          {h.month===month&&<span style={{fontSize:8,background:'rgba(245,158,11,0.15)',color:'#fde68a',border:'1px solid rgba(245,158,11,0.3)',padding:'1px 6px',borderRadius:20,fontFamily:"'JetBrains Mono',monospace"}}>ATUAL</span>}
                        </div>
                        <div style={{fontSize:15,fontWeight:800,color:c,fontFamily:"'JetBrains Mono',monospace",marginBottom:2}}>{bal>=0?'':'-'}{fmt(Math.abs(bal))}</div>
                        <div style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:8}}>{fmt(h.total)} gastos</div>
                        <div style={{background:T.border,borderRadius:99,height:3}}>
                          <div style={{width:`${p}%`,height:'100%',background:c,borderRadius:99}}/>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}

        {/* ════ PRIVACY ════ */}
        {tab==='privacy' && (
          <div style={{animation:'fadeUp .3s ease',maxWidth:680}}>
            <div style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:'-1px',marginBottom:3}}>Privacidade</div>
            <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:20}}>LGPD · Política de Dados</div>
            <div style={{...G.sec('rgba(244,63,94,0.2)'),background:isDark?'rgba(244,63,94,0.05)':'rgba(244,63,94,0.03)',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{fontSize:24,flexShrink:0}}>⚠️</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#f43f5e',marginBottom:6}}>Excluir minha conta</div>
                  <div style={{fontSize:12,color:T.textMuted,lineHeight:1.6,marginBottom:14}}>
                    Ao excluir sua conta, todos os seus dados serão permanentemente apagados. Esta ação <strong style={{color:T.text}}>não pode ser desfeita</strong>.
                  </div>
                  <button onClick={deleteAccount} style={{...G.btn('rgba(244,63,94,0.15)'),color:'#f43f5e',border:'1px solid rgba(244,63,94,0.3)',fontSize:12}}>Excluir minha conta →</button>
                </div>
              </div>
            </div>
            <div style={{...G.sec(T.border),lineHeight:1.8}}>
              <div style={{fontSize:13,fontWeight:800,marginBottom:16,paddingBottom:10,borderBottom:'1px solid '+T.border}}>Política de Privacidade — Finly</div>
              <div style={{fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:16,letterSpacing:'1px'}}>ÚLTIMA ATUALIZAÇÃO: MARÇO/2026</div>
              {[
                ['1. Quem somos','O Finly é um aplicativo de controle financeiro pessoal. Nosso objetivo é ajudar você a organizar suas finanças de forma simples e segura.'],
                ['2. Dados que coletamos','Coletamos apenas o necessário: seu e-mail para autenticação e os dados financeiros que você cadastra. Não coletamos dados de pagamento ou informações sensíveis.'],
                ['3. Como usamos seus dados','Seus dados são usados exclusivamente para exibir seu painel. Não vendemos, compartilhamos ou usamos para publicidade.'],
                ['4. Segurança','Utilizamos o Supabase com Row Level Security (RLS) habilitado. Nenhum usuário acessa dados de outro. Comunicação via HTTPS.'],
                ['5. Seus direitos (LGPD)','Você tem direito a acessar, corrigir e excluir seus dados permanentemente a qualquer momento pelo app.'],
                ['6. Retenção de dados','Dados mantidos enquanto sua conta estiver ativa. Ao excluir a conta, todos os dados são removidos em até 24h.'],
                ['7. Contato','Dúvidas: contato@finly.api.br'],
              ].map(([title,text]) => (
                <div key={title} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:800,marginBottom:4,color:T.text}}>{title}</div>
                  <div style={{fontSize:12,color:T.textMuted,lineHeight:1.7}}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isMobile && <MobileNav tab={tab} setTab={setTab} T={T} isDark={isDark}/>}

      {editingExpense  && <EditModal   expense={editingExpense}  onSave={editExpense} onClose={() => setEditingExpense(null)}  T={T} isDark={isDark}/>}
      {deletingExpense && <DeleteModal expense={deletingExpense} onConfirm={() => removeExpense(deletingExpense.id)} onClose={() => setDeletingExpense(null)} T={T}/>}

      <Toast msg={toast.msg} type={toast.type}/>
    </div>
  )
}
