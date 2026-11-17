-- ============================================================
-- FINLY — Setup Multi-Usuário (idempotente)
-- Cole no SQL Editor do Supabase e clique em RUN.
-- Pode ser executado várias vezes e em bancos já existentes.
-- ============================================================

-- 0. FUNÇÃO AUTO-UPDATE de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TABELA DE DESPESAS (variáveis, por usuário + mês)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.despesas (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  value          numeric(10,2) NOT NULL,
  paid           boolean DEFAULT false,
  category       text DEFAULT 'Outros',
  month          text NOT NULL,          -- formato: "02/2026"
  fixed_id       bigint,                 -- referência lógica a despesas_fixas.id
  parcela_atual  integer,
  parcelas_total integer,
  parcela_grupo  text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Para bancos que já tinham a tabela criada pela versão anterior do script
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS fixed_id       bigint;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS parcela_atual  integer;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS parcelas_total integer;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS parcela_grupo  text;

-- 2. TABELA DE RECEITAS (por usuário + mês, editável)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.receitas (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month        text NOT NULL,
  salary       numeric(10,2) DEFAULT 0,
  vtvr         numeric(10,2) DEFAULT 0,
  commission   numeric(10,2) DEFAULT 0,
  income_items text,                     -- JSON serializado (JSON.stringify no frontend)
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS income_items text;

-- 3. TABELA DE DESPESAS FIXAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.despesas_fixas (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  value      numeric(10,2) NOT NULL,
  category   text DEFAULT 'Outros',
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. TABELA DE STATUS MENSAL DAS DESPESAS FIXAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.despesas_fixas_status (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fixed_id     bigint NOT NULL REFERENCES public.despesas_fixas(id) ON DELETE CASCADE,
  month        text NOT NULL,
  paid         boolean DEFAULT false,
  custom_value numeric(10,2),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT despesas_fixas_status_user_fixed_month_key UNIQUE (user_id, fixed_id, month)
);

-- 5. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS despesas_user_month         ON public.despesas (user_id, month);
CREATE INDEX IF NOT EXISTS despesas_user_parcela_grupo ON public.despesas (user_id, parcela_grupo);
CREATE INDEX IF NOT EXISTS receitas_user_month         ON public.receitas (user_id, month);
CREATE INDEX IF NOT EXISTS despesas_fixas_user_active  ON public.despesas_fixas (user_id, active);

-- 6. TRIGGERS de updated_at
-- ============================================================
DROP TRIGGER IF EXISTS despesas_updated_at ON public.despesas;
CREATE TRIGGER despesas_updated_at
  BEFORE UPDATE ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS receitas_updated_at ON public.receitas;
CREATE TRIGGER receitas_updated_at
  BEFORE UPDATE ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS despesas_fixas_updated_at ON public.despesas_fixas;
CREATE TRIGGER despesas_fixas_updated_at
  BEFORE UPDATE ON public.despesas_fixas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS despesas_fixas_status_updated_at ON public.despesas_fixas_status;
CREATE TRIGGER despesas_fixas_status_updated_at
  BEFORE UPDATE ON public.despesas_fixas_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. ROW LEVEL SECURITY — cada usuário vê APENAS seus dados
-- ============================================================
ALTER TABLE public.despesas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_fixas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_fixas_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "despesas_own" ON public.despesas;
CREATE POLICY "despesas_own" ON public.despesas
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "receitas_own" ON public.receitas;
CREATE POLICY "receitas_own" ON public.receitas
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "despesas_fixas_own" ON public.despesas_fixas;
CREATE POLICY "despesas_fixas_own" ON public.despesas_fixas
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "despesas_fixas_status_own" ON public.despesas_fixas_status;
CREATE POLICY "despesas_fixas_status_own" ON public.despesas_fixas_status
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. RPC: EXCLUIR A PRÓPRIA CONTA (usada pelo frontend: supabase.rpc('delete_user'))
-- ON DELETE CASCADE remove automaticamente todos os dados do usuário.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- 9. VERIFICAR
-- ============================================================
SELECT 'despesas' AS tabela, count(*) FROM public.despesas
UNION ALL
SELECT 'receitas', count(*) FROM public.receitas
UNION ALL
SELECT 'despesas_fixas', count(*) FROM public.despesas_fixas
UNION ALL
SELECT 'despesas_fixas_status', count(*) FROM public.despesas_fixas_status;

-- ============================================================
-- PRONTO! Agora:
-- 1. Vá em Authentication → Providers → Email → Enable
-- 2. (Opcional) Habilite Google OAuth em Authentication → Providers → Google
-- 3. Rode o projeto: npm install && npm run dev
-- ============================================================