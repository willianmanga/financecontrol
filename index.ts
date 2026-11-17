// Supabase Edge Function — Webhook da Hotmart para o Finly
// Deploy: supabase functions deploy hotmart-webhook --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DAY_MS = 24 * 60 * 60 * 1000

const ACTIVATE_EVENTS = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']
const BLOCK_EVENTS = [
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'SUBSCRIPTION_CANCELLATION',
  'PURCHASE_EXPIRED',
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Comparação sem curto-circuito (evita timing attack no token)
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // 1. Valida o hottok
  const expected = Deno.env.get('HOTMART_HOTTOK') ?? ''
  const received = req.headers.get('x-hotmart-hottok') ?? ''
  if (!expected || !safeEqual(received, expected)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // 2. Lê o payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const event: string = payload?.event ?? ''
  const data = payload?.data
  const email: string | undefined = data?.buyer?.email?.toLowerCase().trim()
  const offerOrPlan: string =
    data?.purchase?.offer?.code ?? data?.subscription?.plan?.name ?? ''
  const transaction: string | null = data?.purchase?.transaction ?? null

  const isActivate = ACTIVATE_EVENTS.includes(event)
  const isBlock = BLOCK_EVENTS.includes(event)

  // Eventos que não tratamos: responde 200 para a Hotmart não reenviar
  if (!isActivate && !isBlock) return json({ ok: true, ignored: event })
  if (!email) return json({ error: 'Buyer email missing' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Procura a assinatura pelo e-mail. Todo usuário já cadastrado tem uma linha
  // (migração VIP ou trigger), então ela já traz o user_id correto.
  const { data: existing, error: findErr } = await supabase
    .from('assinaturas')
    .select('id, user_id, plan_type')
    .eq('email', email)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findErr) {
    console.error('Erro ao buscar assinatura:', findErr)
    return json({ error: 'Database error' }, 500) // Hotmart tentará de novo
  }

  // Contas VIP (base antiga) nunca são rebaixadas por eventos da Hotmart
  if (existing?.plan_type === 'vip') return json({ ok: true, skipped: 'vip' })

  const now = Date.now()

  if (isActivate) {
    const monthlyOffer = Deno.env.get('HOTMART_OFFER_MONTHLY')
    const isMonthly = !!monthlyOffer && offerOrPlan === monthlyOffer
    const planType = isMonthly ? 'monthly' : 'yearly'
    const expiresAt = new Date(now + (isMonthly ? 30 : 365) * DAY_MS).toISOString()

    const fields = {
      status: 'active',
      plan_type: planType,
      expires_at: expiresAt,
      hotmart_transaction: transaction,
    }

    const { error } = existing
      ? await supabase.from('assinaturas').update(fields).eq('id', existing.id)
      // Comprou antes de criar a conta: user_id fica nulo e o trigger
      // on_auth_user_created vincula quando ele se cadastrar com o mesmo e-mail.
      : await supabase.from('assinaturas').insert({ email, user_id: null, ...fields })

    if (error) {
      console.error('Erro ao ativar assinatura:', error)
      return json({ error: 'Database error' }, 500)
    }
    return json({ ok: true, event, plan_type: planType })
  }

  // Eventos de bloqueio
  if (!existing) return json({ ok: true, note: 'no subscription for email' })

  const { error } = await supabase
    .from('assinaturas')
    .update({ status: 'canceled', expires_at: new Date(now).toISOString() })
    .eq('id', existing.id)

  if (error) {
    console.error('Erro ao cancelar assinatura:', error)
    return json({ error: 'Database error' }, 500)
  }
  return json({ ok: true, event, status: 'canceled' })
})
