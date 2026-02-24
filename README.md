# 💰 FinanceControl

Dashboard de controle financeiro pessoal com suporte a **multi-usuários**, histórico mensal e integração com **Supabase**.

## Stack
- **React 18** + Vite
- **Supabase** (PostgreSQL + Auth)
- **Recharts** (gráficos)

## Como rodar

### 1. Clonar e instalar
```bash
git clone https://github.com/seu-usuario/financecontrol.git
cd financecontrol
npm install
```

### 2. Configurar o banco (Supabase)
1. Acesse seu projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo de `setup_supabase.sql` e clique em **Run**
4. Vá em **Authentication → Providers → Email** e habilite

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Edite o `.env` com suas credenciais:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Rodar
```bash
npm run dev
```
Acesse: http://localhost:5173

### 5. Build para produção
```bash
npm run build
```

## Deploy gratuito (Vercel ou Netlify)

### Vercel
```bash
npm i -g vercel
vercel --prod
```
Adicione as variáveis de ambiente no painel da Vercel.

### Netlify
Arraste a pasta `dist/` para [netlify.com/drop](https://app.netlify.com/drop)

## Funcionalidades
- ✅ Login/Cadastro com e-mail e senha
- ✅ Login com Google (OAuth)
- ✅ Multi-usuários — cada um vê apenas seus dados
- ✅ Despesas por mês com filtro
- ✅ Receitas editáveis por mês
- ✅ Gráficos: pizza, barras, área (histórico)
- ✅ Histórico real de todos os meses
- ✅ Progresso de pagamentos
- ✅ Row Level Security no Supabase

## Estrutura
```
src/
├── lib/
│   └── supabase.js       # cliente Supabase
├── pages/
│   ├── AuthPage.jsx      # login e cadastro
│   └── Dashboard.jsx     # dashboard principal
└── App.jsx               # roteamento por autenticação
```
