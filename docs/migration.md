# Roteiro de Migração — Antigravity → GitHub → Supabase → Vercel

## 1. Fase 1: Preparação e Auditoria Local (Concluída)

- Mapeamento completo dos componentes do projeto.
- Classificação estrita entre Control Plane e Data Plane.
- Configuração de `.gitignore` abrangente e `.gitattributes` para normalização de quebras de linha (LF).
- Validação completa dos 158 testes automatizados de resiliência e integridade.
- Criação do arquivo de configuração `vercel.json`.

---

## 2. Fase 2: Publicação no Repositório GitHub

```bash
# 1. Inicializar o repositório git localmente (caso não inicializado)
git init

# 2. Adicionar arquivos e criar commit inicial
git add .
git commit -m "feat: complete enterprise backup platform and migration setup"

# 3. Vincular repositório remoto no GitHub
git branch -M main
git remote add origin https://github.com/<org-ou-usuario>/workpulse-enterprise.git

# 4. Enviar código para o GitHub
git push -u origin main
```

---

## 3. Fase 3: Provisionamento e Migração do Supabase

1. Criar um novo projeto no Supabase (`https://supabase.com`).
2. Obter as credenciais em **Project Settings > API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
3. Aplicar as migrações SQL localizadas na pasta `supabase/migrations/`:
   ```bash
   # Via Supabase CLI
   supabase login
   supabase link --project-ref <project-id>
   supabase db push
   ```
   Ou aplicar o conteúdo dos arquivos SQL diretamente pelo **SQL Editor** do Supabase na ordem:
   - `supabase/migrations/20260910000000_security_pentest_production.sql`
   - `supabase/migrations/20260911000000_backup_platform_control_plane.sql`

---

## 4. Fase 4: Configuração e Deploy no Vercel

1. Importar o repositório GitHub no painel do Vercel (`https://vercel.com`).
2. Configurar o Preset: **Vite**.
3. Adicionar todas as variáveis de ambiente documentadas em `docs/environment.md`.
4. Executar o primeiro Deploy.
5. Configurar o domínio corporativo e SSL automático.

---

## 5. Fase 5: Validação Pós-Deploy e Paridade

- Executar smoke test nos endpoints públicos: `GET /api/health`.
- Testar login e isolamento de tenant no painel Web.
- Registrar um Agent de teste e verificar a emissão do sinal de heartbeat.
- Validar a execução de um job de backup e conferir o registro no catálogo de snapshots e auditoria.
