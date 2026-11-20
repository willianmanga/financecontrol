import { useState, useEffect } from 'react'
import { setOrigin, setSelectedPlan } from '../lib/checkout'

const CONTACT_EMAIL = 'contato@finly.api.br'
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL || '/privacidade.html'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/* ─────────────────────────────────────────────
   MOCKUP INTERATIVO DO DASHBOARD
───────────────────────────────────────────── */
const INITIAL_ITEMS = [
  { id: 1, name: 'Aluguel', value: 1400, kind: 'fixa', paid: true },
  { id: 2, name: 'Internet', value: 119.9, kind: 'fixa', paid: true },
  { id: 3, name: 'Notebook', value: 389.9, kind: 'parcela', label: '3/12', paid: false },
  { id: 4, name: 'Energia', value: 187.4, kind: 'fixa', paid: false },
  { id: 5, name: 'Mercado', value: 640, kind: 'var', paid: true },
  { id: 6, name: 'Academia', value: 99.9, kind: 'fixa', paid: false },
]
const MOCK_INCOME = 5200

function DashMock() {
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 450)
    return () => clearTimeout(t)
  }, [])

  const total = items.reduce((s, i) => s + i.value, 0)
  const paid = items.filter((i) => i.paid).reduce((s, i) => s + i.value, 0)
  const pending = total - paid
  const balance = MOCK_INCOME - total
  const pct = total ? Math.round((paid / total) * 100) : 0

  const toggle = (id) => setItems((arr) => arr.map((i) => (i.id === id ? { ...i, paid: !i.paid } : i)))

  const cards = [
    { label: 'RECEITAS', value: MOCK_INCOME, color: '#10b981' },
    { label: 'DESPESAS', value: total, color: '#f43f5e' },
    { label: 'FALTA PAGAR', value: pending, color: '#f59e0b' },
    { label: 'SALDO FINAL', value: balance, color: '#818cf8' },
  ]

  return (
    <div className="lp-mock" aria-label="Exemplo do painel do Finly">
      <div className="lp-mock-top">
        <div className="lp-dots"><i /><i /><i /></div>
        <div className="lp-mock-title">Novembro · 2026</div>
        <div className="lp-live">● ao vivo</div>
      </div>

      <div className="lp-mock-cards">
        {cards.map((c) => (
          <div key={c.label} className="lp-mini" style={{ borderColor: c.color + '33' }}>
            <div className="lp-mini-label">{c.label}</div>
            <div className="lp-mini-value" style={{ color: c.color }}>{brl(c.value)}</div>
          </div>
        ))}
      </div>

      <div className="lp-progress-box">
        <div className="lp-progress-head">
          <span>Progresso de pagamentos</span>
          <strong>{ready ? pct : 0}% pago</strong>
        </div>
        <div className="lp-bar"><div className="lp-bar-fill" style={{ width: (ready ? pct : 0) + '%' }} /></div>
      </div>

      <div className="lp-rows">
        {items.map((i) => (
          <button key={i.id} type="button" className={'lp-row' + (i.paid ? ' is-paid' : '')} onClick={() => toggle(i.id)} aria-pressed={i.paid}>
            <span className="lp-check">{i.paid ? '✓' : ''}</span>
            <span className="lp-row-name">{i.name}</span>
            {i.kind === 'fixa' && <span className="lp-tag lp-tag-fixa">📌 fixa</span>}
            {i.kind === 'parcela' && <span className="lp-tag lp-tag-parc">{i.label}</span>}
            <span className="lp-row-val">{brl(i.value)}</span>
          </button>
        ))}
      </div>
      <div className="lp-mock-hint">👆 Toque em uma despesa para marcar como paga</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   DADOS DAS SEÇÕES
───────────────────────────────────────────── */
const PAIN = [
  'Esquece de lançar a conta fixa todo mês',
  'Perde a conta de quantas parcelas ainda faltam',
  'Fórmula quebra e ninguém sabe o porquê',
  'Abrir a planilha no celular é um sofrimento',
  'Relatório? Só copiando e colando na mão',
]
const SOLUTION = [
  'Despesas fixas aparecem sozinhas todo mês',
  'Parcelas 1/12, 2/12… criadas automaticamente',
  'Saldo e % pago calculados na hora',
  'Instala no celular como um app (iOS e Android)',
  'Relatório mensal em PDF com 1 clique',
]

const FEATURES = [
  { icon: '📊', color: '#6366f1', title: 'Dashboard completo', text: 'Receitas, despesas, falta pagar e saldo final do mês em cards claros, com barra de progresso do que já foi pago.' },
  { icon: '📌', color: '#f59e0b', title: 'Despesas fixas automáticas', text: 'Cadastre uma vez e ela aparece todo mês. Mudou o valor? Edite só no mês atual ou dali em diante.' },
  { icon: '💳', color: '#f43f5e', title: 'Controle de parcelamentos', text: 'Lançou uma compra em 12x? O Finly cria as parcelas nos meses seguintes (1/12, 2/12…) sem você digitar de novo.' },
  { icon: '📈', color: '#10b981', title: 'Gráficos e histórico', text: 'Veja para onde o dinheiro vai por categoria (pizza e barras) e acompanhe a evolução mês a mês.' },
  { icon: '📄', color: '#8b5cf6', title: 'Relatório em PDF', text: 'Exporte o resumo do mês em PDF com um clique para guardar, imprimir ou compartilhar.' },
  { icon: '📱', color: '#818cf8', title: 'App no celular + login fácil', text: 'Instale na tela inicial (PWA) e entre com Google ou e-mail e senha. Seus dados ficam protegidos.' },
]

const FAQ = [
  { q: 'Preciso conectar meu banco ou informar senhas?', a: 'Não. O Finly nunca pede senha de banco nem conexão bancária. Você lança suas receitas e despesas manualmente, com total privacidade e em conformidade com a LGPD.' },
  { q: 'Funciona no iPhone e no Android?', a: 'Sim. O Finly funciona direto no navegador e pode ser instalado na tela inicial como um app (PWA). No iPhone: abra no Safari, toque em Compartilhar e em "Adicionar à Tela de Início". No Android: use o menu do Chrome e escolha "Instalar app".' },
  { q: 'Como funciona o teste grátis de 7 dias?', a: 'Ao criar sua conta, os 7 dias começam automaticamente, sem pedir cartão de crédito. Você usa todas as funcionalidades. Só decide por um plano se gostar.' },
  { q: 'O que acontece quando o teste termina?', a: 'O acesso é pausado até você escolher um plano (mensal ou anual). Nada é cobrado automaticamente, pois não pedimos cartão no cadastro.' },
  { q: 'Como faço para cancelar?', a: `Sem fidelidade. Para cancelar, é só enviar um e-mail para ${CONTACT_EMAIL} e nós resolvemos. Se você assinou pela Hotmart, também pode cancelar direto por lá.` },
]

/* ─────────────────────────────────────────────
   CSS (responsivo — testado para 360px)
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
html{scroll-behavior:smooth}
.lp,.lp *{box-sizing:border-box}
.lp{background:#050810;color:#e2e8f0;font-family:'Outfit',sans-serif;min-height:100vh;overflow-x:hidden;position:relative;-webkit-font-smoothing:antialiased}
.lp button{font-family:inherit}
.lp a{color:inherit}
.lp-wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 20px}
.lp-mono{font-family:'JetBrains Mono',monospace}
.lp section[id]{scroll-margin-top:76px}

@keyframes lpFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes lpPulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes lpShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

/* NAV */
.lp-nav{position:fixed;top:0;left:0;right:0;z-index:50;transition:background .25s,border-color .25s;border-bottom:1px solid transparent}
.lp-nav.scrolled{background:rgba(5,8,16,.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-color:rgba(99,102,241,.2)}
.lp-nav-in{display:flex;align-items:center;justify-content:space-between;gap:10px;height:64px}
.lp-logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:20px;letter-spacing:-.5px;background:none;border:none;color:#e2e8f0;cursor:pointer;padding:0}
.lp-logo-ic{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 14px rgba(99,102,241,.45)}
.lp-links{display:flex;gap:26px}
.lp-links a{font-size:14px;font-weight:600;color:#94a3b8;text-decoration:none;transition:color .2s}
.lp-links a:hover{color:#e2e8f0}
.lp-nav-actions{display:flex;align-items:center;gap:8px}

.lp-btn{border:none;cursor:pointer;font-weight:800;border-radius:12px;transition:transform .15s,box-shadow .2s,background .2s;white-space:nowrap}
.lp-btn:active{transform:scale(.98)}
.lp-btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 6px 22px rgba(99,102,241,.4);padding:12px 22px;font-size:14px;position:relative;overflow:hidden}
.lp-btn-primary:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(99,102,241,.55)}
.lp-btn-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%);transform:translateX(-100%);animation:lpShine 3.8s ease-in-out infinite}
.lp-btn-ghost{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#e2e8f0;padding:11px 18px;font-size:14px}
.lp-btn-ghost:hover{background:rgba(255,255,255,.09)}
.lp-btn-lg{padding:15px 28px;font-size:16px;border-radius:14px}
.lp-nav .lp-btn{padding:9px 14px;font-size:13px}

/* HERO */
.lp-hero{position:relative;padding:116px 0 56px}
.lp-glow{position:absolute;border-radius:50%;pointer-events:none}
.lp-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;position:relative}
.lp-hero-grid>*{min-width:0}
.lp-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35);color:#6ee7b7;border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:20px;animation:lpFadeUp .6s both}
.lp h1{font-size:clamp(34px,5.4vw,58px);line-height:1.04;letter-spacing:-1.8px;font-weight:900;margin:0 0 18px;animation:lpFadeUp .6s .08s both}
.lp-grad{background:linear-gradient(135deg,#818cf8,#c084fc 55%,#f0abfc);-webkit-background-clip:text;background-clip:text;color:transparent}
.lp-sub{font-size:clamp(16px,2vw,19px);line-height:1.6;color:#94a3b8;margin:0 0 28px;max-width:540px;animation:lpFadeUp .6s .16s both}
.lp-sub b{color:#cbd5e1;font-weight:600}
.lp-cta-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;animation:lpFadeUp .6s .24s both}
.lp-cta-note{font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px}
.lp-trust{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:30px;animation:lpFadeUp .6s .32s both}
.lp-trust span{font-size:12.5px;color:#94a3b8;display:flex;align-items:center;gap:6px}

/* MOCKUP */
.lp-mock-wrap{position:relative;animation:lpFadeUp .8s .2s both}
.lp-mock{background:rgba(10,14,26,.97);border:1px solid rgba(99,102,241,.3);border-radius:20px;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(99,102,241,.14);position:relative;overflow:hidden}
.lp-mock::before{content:'';position:absolute;top:0;left:20%;right:20%;height:2px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.9),transparent)}
.lp-mock-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px}
.lp-dots{display:flex;gap:5px}
.lp-dots i{width:9px;height:9px;border-radius:50%;background:#1e293b;display:block}
.lp-dots i:nth-child(1){background:#f43f5e}.lp-dots i:nth-child(2){background:#f59e0b}.lp-dots i:nth-child(3){background:#10b981}
.lp-mock-title{font-size:12px;font-weight:700;color:#cbd5e1;font-family:'JetBrains Mono',monospace}
.lp-live{font-size:10px;color:#10b981;font-family:'JetBrains Mono',monospace;animation:lpPulse 2s infinite}
.lp-mock-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.lp-mini{background:rgba(255,255,255,.03);border:1px solid;border-radius:12px;padding:10px 11px;min-width:0}
.lp-mini-label{font-size:8.5px;letter-spacing:1.6px;color:#64748b;font-family:'JetBrains Mono',monospace;margin-bottom:4px}
.lp-mini-value{font-size:15px;font-weight:800;font-family:'JetBrains Mono',monospace;letter-spacing:-.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .3s}
.lp-progress-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px 12px;margin-bottom:10px}
.lp-progress-head{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:7px;gap:8px}
.lp-progress-head strong{color:#10b981;font-family:'JetBrains Mono',monospace;white-space:nowrap}
.lp-bar{height:8px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden}
.lp-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#10b981,#34d399);transition:width 1.2s cubic-bezier(.22,1,.36,1);box-shadow:0 0 12px rgba(16,185,129,.5)}
.lp-rows{display:flex;flex-direction:column;gap:5px}
.lp-row{display:flex;align-items:center;gap:8px;width:100%;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:8px 10px;cursor:pointer;color:#e2e8f0;text-align:left;transition:background .2s,border-color .2s;min-width:0}
.lp-row:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3)}
.lp-check{width:18px;height:18px;border-radius:50%;border:1.5px solid #475569;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;flex-shrink:0;transition:all .2s}
.lp-row.is-paid .lp-check{background:#10b981;border-color:#10b981}
.lp-row.is-paid .lp-row-name,.lp-row.is-paid .lp-row-val{opacity:.5;text-decoration:line-through}
.lp-row-name{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lp-tag{font-size:9px;font-weight:700;border-radius:6px;padding:2px 6px;font-family:'JetBrains Mono',monospace;white-space:nowrap;flex-shrink:0}
.lp-tag-fixa{background:rgba(245,158,11,.14);color:#fbbf24}
.lp-tag-parc{background:rgba(244,63,94,.14);color:#fb7185}
.lp-row-val{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;white-space:nowrap;flex-shrink:0}
.lp-mock-hint{text-align:center;font-size:10.5px;color:#64748b;margin-top:10px}
.lp-float{position:absolute;background:rgba(10,14,26,.95);border:1px solid rgba(16,185,129,.35);border-radius:12px;padding:8px 12px;font-size:11px;font-weight:700;color:#6ee7b7;box-shadow:0 10px 30px rgba(0,0,0,.5);animation:lpFloat 4s ease-in-out infinite;white-space:nowrap}

/* SECTIONS */
.lp-sec{padding:76px 0}
.lp-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2.5px;color:#818cf8;text-align:center;margin-bottom:12px;text-transform:uppercase}
.lp h2{font-size:clamp(28px,4vw,42px);font-weight:900;letter-spacing:-1.2px;line-height:1.1;text-align:center;margin:0 0 14px}
.lp-sec-sub{text-align:center;color:#94a3b8;font-size:16px;line-height:1.6;max-width:600px;margin:0 auto 44px}

/* DOR x SOLUÇÃO */
.lp-vs{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.lp-vs>*{min-width:0}
.lp-vs-card{border-radius:20px;padding:28px 26px}
.lp-vs-bad{background:rgba(244,63,94,.05);border:1px solid rgba(244,63,94,.2)}
.lp-vs-good{background:linear-gradient(160deg,rgba(99,102,241,.14),rgba(16,185,129,.07));border:1px solid rgba(99,102,241,.4);box-shadow:0 20px 60px rgba(99,102,241,.12)}
.lp-vs-head{font-size:12px;letter-spacing:2px;font-family:'JetBrains Mono',monospace;font-weight:700;margin-bottom:6px}
.lp-vs-title{font-size:22px;font-weight:800;margin-bottom:18px;letter-spacing:-.4px}
.lp-vs ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:13px}
.lp-vs li{display:flex;gap:11px;font-size:15px;line-height:1.45;color:#cbd5e1}
.lp-vs li span{flex-shrink:0;font-weight:800}

/* FEATURES */
.lp-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.lp-feat-grid>*{min-width:0}
.lp-feat{background:rgba(10,14,26,.97);border:1px solid rgba(99,102,241,.2);border-radius:18px;padding:24px 22px;transition:transform .25s,border-color .25s,box-shadow .25s}
.lp-feat:hover{transform:translateY(-4px);border-color:rgba(99,102,241,.5);box-shadow:0 18px 44px rgba(99,102,241,.14)}
.lp-feat-ic{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px}
.lp-feat h3{font-size:18px;font-weight:800;margin:0 0 8px;letter-spacing:-.3px}
.lp-feat p{font-size:14.5px;line-height:1.6;color:#94a3b8;margin:0}

/* PLANOS */
.lp-plans{display:grid;grid-template-columns:1fr 1fr;gap:18px;max-width:800px;margin:0 auto;align-items:stretch}
.lp-plans>*{min-width:0}
.lp-plan{background:rgba(10,14,26,.97);border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:30px 26px;position:relative;display:flex;flex-direction:column}
.lp-plan-hl{border:1px solid rgba(99,102,241,.7);background:linear-gradient(160deg,rgba(99,102,241,.2),rgba(139,92,246,.1) 60%,rgba(10,14,26,.97));box-shadow:0 24px 70px rgba(99,102,241,.28)}
.lp-plan-flag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:10px;font-weight:800;letter-spacing:1px;padding:5px 14px;border-radius:999px;font-family:'JetBrains Mono',monospace;white-space:nowrap;box-shadow:0 6px 18px rgba(99,102,241,.5)}
.lp-plan-name{font-size:12px;letter-spacing:2px;font-family:'JetBrains Mono',monospace;color:#94a3b8;margin-bottom:12px}
.lp-plan-hl .lp-plan-name{color:#a5b4fc}
.lp-price{font-size:44px;font-weight:900;letter-spacing:-2px;line-height:1;font-family:'JetBrains Mono',monospace}
.lp-price small{font-size:15px;font-weight:600;color:#64748b;letter-spacing:0}
.lp-plan-save{margin:10px 0 0;font-size:13px;color:#94a3b8;min-height:38px}
.lp-plan-save s{color:#64748b}
.lp-plan-save b{color:#34d399}
.lp-plan ul{list-style:none;margin:18px 0 24px;padding:0;display:flex;flex-direction:column;gap:10px;flex:1}
.lp-plan li{font-size:14px;color:#cbd5e1;display:flex;gap:9px;line-height:1.4}
.lp-plan li span{color:#10b981;font-weight:800;flex-shrink:0}
.lp-plan .lp-btn{width:100%;padding:14px}
.lp-plan-foot{text-align:center;font-size:11.5px;color:#64748b;margin-top:10px}

/* FAQ */
.lp-faq{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.lp-faq-item{background:rgba(10,14,26,.97);border:1px solid rgba(99,102,241,.2);border-radius:14px;overflow:hidden;transition:border-color .2s}
.lp-faq-item.open{border-color:rgba(99,102,241,.5)}
.lp-faq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;background:none;border:none;color:#e2e8f0;padding:18px 20px;font-size:16px;font-weight:700;text-align:left;cursor:pointer}
.lp-faq-q i{font-style:normal;font-size:20px;color:#818cf8;transition:transform .25s;flex-shrink:0}
.lp-faq-item.open .lp-faq-q i{transform:rotate(45deg)}
.lp-faq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s}
.lp-faq-item.open .lp-faq-a{grid-template-rows:1fr}
.lp-faq-a>div{overflow:hidden}
.lp-faq-a p{margin:0;padding:0 20px 18px;font-size:14.5px;line-height:1.65;color:#94a3b8}
.lp-faq-a a{color:#a5b4fc}

/* CTA FINAL */
.lp-final{background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.12));border:1px solid rgba(99,102,241,.4);border-radius:26px;padding:52px 28px;text-align:center;position:relative;overflow:hidden}
.lp-final h2{margin-bottom:12px}
.lp-final p{color:#94a3b8;font-size:16px;margin:0 auto 26px;max-width:480px;line-height:1.6}

/* FOOTER */
.lp-footer{border-top:1px solid rgba(255,255,255,.06);padding:36px 0 44px;margin-top:40px}
.lp-footer-in{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.lp-footer-links{display:flex;gap:22px;flex-wrap:wrap;font-size:13px}
.lp-footer-links a{color:#94a3b8;text-decoration:none}
.lp-footer-links a:hover{color:#e2e8f0}
.lp-copy{font-size:11.5px;color:#475569;font-family:'JetBrains Mono',monospace;margin-top:22px;text-align:center}

/* TABLET */
@media (max-width:960px){
  .lp-hero{padding-top:100px}
  .lp-hero-grid{grid-template-columns:1fr;gap:40px}
  .lp-sub{max-width:none}
  .lp-mock-wrap{max-width:520px;margin:0 auto;width:100%}
  .lp-feat-grid{grid-template-columns:1fr 1fr}
}
/* MOBILE */
@media (max-width:700px){
  .lp-links{display:none}
  .lp-vs,.lp-plans{grid-template-columns:1fr}
  .lp-plans{max-width:440px}
  .lp-plan-hl{order:-1}
  .lp-sec{padding:56px 0}
  .lp-float{display:none}
}
@media (max-width:560px){
  .lp-feat-grid{grid-template-columns:1fr}
  .lp-cta-row .lp-btn-lg{width:100%}
  .lp-cta-note{width:100%;justify-content:center}
  .lp-footer-in{flex-direction:column;text-align:center}
}
@media (max-width:400px){
  .lp-wrap{padding:0 16px}
  .lp-logo{font-size:18px}
  .lp-logo-ic{width:30px;height:30px;font-size:15px}
  .lp-nav .lp-btn{padding:8px 10px;font-size:12px}
  .lp-nav-actions{gap:6px}
  .lp-mini-value{font-size:13px}
  .lp-mini{padding:9px}
  .lp-row{padding:7px 8px;gap:6px}
  .lp-row-name{font-size:12px}
  .lp-row-val{font-size:11px}
  .lp-price{font-size:38px}
  .lp-vs-card{padding:22px 18px}
  .lp-final{padding:40px 18px}
  .lp-trust{flex-direction:column;gap:8px}
}
@media (prefers-reduced-motion:reduce){
  .lp *,.lp *::before,.lp *::after{animation:none!important;transition:none!important}
  html{scroll-behavior:auto}
}
`

/* ─────────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────────── */
export default function LandingPage({ onStart }) {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Registra a origem (landing) e, se houver, o plano escolhido; depois abre o AuthPage
  const go = (mode, plan = null) => {
    setOrigin('landing')
    setSelectedPlan(plan)
    onStart(mode)
  }

  return (
    <div className="lp">
      <style>{CSS}</style>

      {/* glows de fundo */}
      <div className="lp-glow" style={{ top: -120, left: -140, width: 520, height: 520, background: 'radial-gradient(circle,rgba(99,102,241,.16),transparent 70%)' }} />
      <div className="lp-glow" style={{ top: 280, right: -180, width: 560, height: 560, background: 'radial-gradient(circle,rgba(139,92,246,.12),transparent 70%)' }} />

      {/* NAVBAR */}
      <nav className={'lp-nav' + (scrolled ? ' scrolled' : '')}>
        <div className="lp-wrap lp-nav-in">
          <button className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Finly — ir ao topo">
            <span className="lp-logo-ic">💰</span>Finly
          </button>
          <div className="lp-links">
            <a href="#beneficios">Benefícios</a>
            <a href="#planos">Planos</a>
            <a href="#faq">Dúvidas</a>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn-ghost" onClick={() => go('login')}>Entrar</button>
            <button className="lp-btn lp-btn-primary" onClick={() => go('register')}>Testar 7 dias grátis</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <div className="lp-badge lp-mono">🎁 7 DIAS GRÁTIS · SEM CARTÃO</div>
            <h1>Chega de planilha bagunçada. <span className="lp-grad">Saiba para onde vai cada real.</span></h1>
            <p className="lp-sub">
              O Finly mostra quanto entrou, quanto saiu e <b>quanto ainda falta pagar</b> — com despesas fixas e parcelas lançadas automaticamente todo mês.
            </p>
            <div className="lp-cta-row">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => go('register')}>Testar 7 dias grátis →</button>
              <span className="lp-cta-note">✓ Sem cartão de crédito no cadastro</span>
            </div>
            <div className="lp-trust">
              <span>🔒 Sem senha de banco</span>
              <span>🛡️ Privacidade LGPD</span>
              <span>📱 Instala no celular</span>
            </div>
          </div>

          <div className="lp-mock-wrap">
            <div className="lp-float" style={{ top: -14, right: 12 }}>✓ Aluguel pago</div>
            <div className="lp-float" style={{ bottom: 34, left: 4, animationDelay: '1.4s', borderColor: 'rgba(244,63,94,.35)', color: '#fda4af' }}>💳 Parcela 3/12 criada</div>
            <DashMock />
          </div>
        </div>
      </header>

      {/* DOR x SOLUÇÃO */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-eyebrow">O problema</div>
          <h2>Sua planilha já te deu dor de cabeça?</h2>
          <p className="lp-sec-sub">Controlar o dinheiro não devia dar trabalho. Veja a diferença na prática.</p>
          <div className="lp-vs">
            <div className="lp-vs-card lp-vs-bad">
              <div className="lp-vs-head" style={{ color: '#fb7185' }}>ANTES</div>
              <div className="lp-vs-title">📓 Planilha / Caderno</div>
              <ul>{PAIN.map((t) => <li key={t}><span style={{ color: '#f43f5e' }}>✕</span>{t}</li>)}</ul>
            </div>
            <div className="lp-vs-card lp-vs-good">
              <div className="lp-vs-head" style={{ color: '#34d399' }}>DEPOIS</div>
              <div className="lp-vs-title">💰 Finly</div>
              <ul>{SOLUTION.map((t) => <li key={t}><span style={{ color: '#10b981' }}>✓</span>{t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="lp-sec" id="beneficios">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Benefícios</div>
          <h2>Tudo que você precisa, nada que atrapalha</h2>
          <p className="lp-sec-sub">Funcionalidades reais, pensadas para quem quer organizar o mês sem complicação.</p>
          <div className="lp-feat-grid">
            {FEATURES.map((f) => (
              <div className="lp-feat" key={f.title}>
                <div className="lp-feat-ic" style={{ background: f.color + '22', border: `1px solid ${f.color}55` }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="lp-sec" id="planos">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Planos</div>
          <h2>Comece grátis. Continue se gostar.</h2>
          <p className="lp-sec-sub">Todo plano começa com 7 dias de teste, sem cartão. Escolha o que cabe no seu bolso.</p>
          <div className="lp-plans">
            <div className="lp-plan">
              <div className="lp-plan-name">PLANO MENSAL</div>
              <div className="lp-price">R$ 19,90<small> /mês</small></div>
              <p className="lp-plan-save">Flexível, pague mês a mês.</p>
              <ul>
                <li><span>✓</span>Todas as funcionalidades</li>
                <li><span>✓</span>Fixas e parcelas automáticas</li>
                <li><span>✓</span>Relatório em PDF</li>
                <li><span>✓</span>App instalável no celular</li>
              </ul>
              <button className="lp-btn lp-btn-ghost" onClick={() => go('register', 'monthly')}>Assinar Mensal</button>
              <div className="lp-plan-foot">Comece com 7 dias grátis</div>
            </div>

            <div className="lp-plan lp-plan-hl">
              <div className="lp-plan-flag">MAIS ESCOLHIDO · ECONOMIZE 59%</div>
              <div className="lp-plan-name">PLANO ANUAL</div>
              <div className="lp-price">R$ 97,00<small> /ano</small></div>
              <p className="lp-plan-save">Equivale a <b>R$ 8,08/mês</b> · <s>R$ 238,80</s> no mensal</p>
              <ul>
                <li><span>✓</span>Todas as funcionalidades</li>
                <li><span>✓</span>Fixas e parcelas automáticas</li>
                <li><span>✓</span>Relatório em PDF</li>
                <li><span>✓</span>App instalável no celular</li>
              </ul>
              <button className="lp-btn lp-btn-primary" onClick={() => go('register', 'yearly')}>Assinar Anual</button>
              <div className="lp-plan-foot">Comece com 7 dias grátis</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec" id="faq">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Perguntas frequentes</div>
          <h2>Ficou com alguma dúvida?</h2>
          <p className="lp-sec-sub">Respondemos as perguntas mais comuns antes de você começar.</p>
          <div className="lp-faq">
            {FAQ.map((f, i) => {
              const open = openFaq === i
              return (
                <div key={f.q} className={'lp-faq-item' + (open ? ' open' : '')}>
                  <button className="lp-faq-q" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}>
                    <span>{f.q}</span><i>+</i>
                  </button>
                  <div className="lp-faq-a"><div><p>{f.a}</p></div></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-wrap" style={{ paddingTop: 24 }}>
        <div className="lp-final">
          <h2>Organize seu mês hoje mesmo</h2>
          <p>Crie sua conta em menos de 1 minuto e use o Finly por 7 dias, de graça.</p>
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => go('register')}>Testar 7 dias grátis →</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-in">
            <div className="lp-logo" style={{ cursor: 'default' }}><span className="lp-logo-ic">💰</span>Finly</div>
            <div className="lp-footer-links">
              <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
          </div>
          <div className="lp-copy">© {new Date().getFullYear()} Finly — Controle Financeiro Pessoal</div>
        </div>
      </footer>
    </div>
  )
}
