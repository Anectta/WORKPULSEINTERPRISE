# GUIA DE DEPLOY DE PRODUÇÃO — WORKPULSE ENTERPRISE

Este documento detalha o passo a passo para implantar o ecossistema completo na infraestrutura de produção: **Vercel + Supabase + Dedicated Cloud Run / Workers**.

---

## 1. Pré-Requisitos de Infraestrutura

- Conta no **GitHub** com repositório configurado.
- Projeto ativo no **Supabase** com extensões `uuid-ossp` e `pgcrypto` habilitadas.
- Conta na **Vercel** vinculada ao repositório GitHub.
- Cluster **Redis** gerenciado (ex: Upstash ou Redis Cloud) para as filas assíncronas.
- Instância no **Google Cloud Run** ou **AWS ECS** para o Security Engine e Runner Isolado.

---

## 2. Passo a Passo do Deploy

### Passo 1: Execução das Migrations no Supabase
1. Acesse o **SQL Editor** no painel do Supabase.
2. Execute o conteúdo de `supabase/migrations/20260910000000_security_pentest_production.sql`.
3. Verifique se todas as tabelas foram criadas com o RLS ativado:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

### Passo 2: Configuração do Projeto na Vercel (Frontend & BFF)
1. Importe o repositório GitHub na Vercel.
2. Configure o framework como **Vite** / **Other (Node.js)**.
3. Configure as variáveis de ambiente com base no `.env.example`:
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SECURITY_HMAC_SECRET`
   - `SECURITY_ENGINE_URL`
   - `SECURITY_ENGINE_API_KEY`
4. Realize o deploy (`npm run build`).

### Passo 3: Deploy do Security Engine & Runner (Cloud Run / Docker)
1. Construa a imagem do worker de segurança a partir da pasta `/server/security`.
2. Configure a variável `SECURITY_SAFE_MODE=true` e configure as permissões de rede.
3. Garanta que o endpoint de health check responda com HTTP 200 em `/api/health/security-engine`.

### Passo 4: Validação Pós-Deploy (Smoke Tests)
1. Acesse `https://seu-dominio.com/api/health`.
2. Execute a suíte de verificação de saúde chamando `/api/health/security-engine` e `/api/health/runner`.
3. Valide o isolamento multi-tenant executando a suíte E2E via painel de administração.
