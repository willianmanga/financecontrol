// Roteamento híbrido de checkout: Asaas (origem = landing page) x Hotmart (acesso direto / afiliados)

const ORIGIN_KEY = 'finly_origin'
const PLAN_KEY = 'finly_selected_plan'
const DIRECT_KEY = 'finly_direct_checkout'

function read(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* localStorage indisponível (modo privado etc.) */ }
}

export const getOrigin = () => read(ORIGIN_KEY)
export const setOrigin = (value) => write(ORIGIN_KEY, value)
export const isLandingOrigin = () => getOrigin() === 'landing'

export function getSelectedPlan() {
  const p = read(PLAN_KEY)
  return p === 'monthly' || p === 'yearly' ? p : null
}
export const setSelectedPlan = (plan) => write(PLAN_KEY, plan === 'monthly' || plan === 'yearly' ? plan : null)

// Checkout direto: o usuário clicou em "Assinar Mensal/Anual" na landing e deve ir ao pagamento antes do trial
export const setDirectCheckout = (on) => write(DIRECT_KEY, on ? '1' : null)
export const isDirectCheckout = () => read(DIRECT_KEY) === '1'
export const clearDirectCheckout = () => write(DIRECT_KEY, null)

// Lê ?origem=hotmart da URL, grava a origem e limpa o parâmetro. Retorna true se veio da Hotmart.
export function captureOriginFromUrl() {
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('origem') !== 'hotmart') return false
    setOrigin('hotmart')
    setSelectedPlan(null)
    clearDirectCheckout()
    url.searchParams.delete('origem')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    return true
  } catch {
    return false
  }
}

// Hotmart aceita ?email= para preencher o checkout
function buildHotmartUrl(base, email) {
  if (!base) return null
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}email=${encodeURIComponent(email || '')}`
}

// Retorna { provider: 'asaas' | 'hotmart', url } para o plano pedido
export function resolveCheckout(plan, email) {
  const yearly = plan === 'yearly'
  if (isLandingOrigin()) {
    const base = yearly ? import.meta.env.VITE_ASAAS_LINK_YEARLY : import.meta.env.VITE_ASAAS_LINK_MONTHLY
    return { provider: 'asaas', url: base || null }
  }
  const base = yearly ? import.meta.env.VITE_HOTMART_LINK_YEARLY : import.meta.env.VITE_HOTMART_LINK_MONTHLY
  return { provider: 'hotmart', url: buildHotmartUrl(base, email) }
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* cai para o fallback */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
