-- ============================================================
-- FINANCE CONTROL — Setup Multi-Usuário
-- Cole no SQL Editor do Supabase e clique em RUN
-- ============================================================

-- 1. TABELA DE DESPESAS (por usuário + mês)
-- ============================================================
CREATE TABLE IF NOT EXISTS despesas (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  value       numeric(10,2) NOT NULL,
  paid        boolean DEFAULT false,
  category    text DEFAULT 'Outros',
  month       text NOT NULL,          -- formato: "02/2026"
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. TABELA DE RECEITAS (por usuário + mês, editável)
-- ============================================================
CREATE TABLE IF NOT EXISTS receitas (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month       text NOT NULL,
  salary      numeric(10,2) DEFAULT 0,
  vtvr        numeric(10,2) DEFAULT 0,
  commission  numeric(10,2) DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, month)
);

-- 3. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS despesas_user_month ON despesas (user_id, month);
CREATE INDEX IF NOT EXISTS receitas_user_month  ON receitas (user_id, month);

-- 4. ROW LEVEL SECURITY — cada usuário vê APENAS seus dados
-- ============================================================
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

-- Despesas: usuário acessa apenas as suas
CREATE POLICY "despesas_own" ON despesas
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Receitas: usuário acessa apenas as suas
CREATE POLICY "receitas_own" ON receitas
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. AUTO-UPDATE de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER despesas_updated_at
  BEFORE UPDATE ON despesas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER receitas_updated_at
  BEFORE UPDATE ON receitas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. VERIFICAR
-- ============================================================
SELECT 'despesas' as tabela, count(*) FROM despesas
UNION ALL
SELECT 'receitas', count(*) FROM receitas;

-- ============================================================
-- PRONTO! Agora:
-- 1. Vá em Authentication → Providers → Email → Enable
-- 2. (Opcional) Habilite Google OAuth em Authentication → Providers → Google
-- 3. Rode o projeto: npm install && npm run dev
-- ============================================================
