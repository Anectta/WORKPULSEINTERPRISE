# Matriz de Ambientes e Variáveis — WorkPulse Enterprise

## 1. Separação de Ambientes

O projeto opera com três ambientes estritamente segregados:

1. **LOCAL (Development)**: Ambiente de desenvolvimento no Antigravity IDE ou máquina do desenvolvedor. Utiliza bancos de dados de teste ou instâncias locais via Docker/Supabase Local.
2. **STAGING**: Réplica exata da arquitetura de produção com banco Supabase dedicado, projeto Vercel para pré-produção e agentes de teste automatizado.
3. **PRODUCTION**: Ambiente corporativo de alta disponibilidade com redundância, logs de auditoria selados, backups automáticos de banco e monitoramento 24/7.

> 🔒 **REGRA DE ISOLAMENTO**: Segredos de Produção NUNCA são compartilhados com Staging ou Desenvolvimento.

---

## 2. Matriz Completa de Variáveis de Ambiente

| Variável | Local | Staging | Production | Segredo? | Onde Configurar? |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `NODE_ENV` | `development` | `staging` | `production` | Não | `.env` / Vercel |
| `PORT` | `3000` | `3000` | `3000` | Não | `.env` |
| `APP_URL` | `http://localhost:3000` | `https://staging.workpulse.com.br` | `https://app.workpulse.com.br` | Não | Vercel |
| `SESSION_SECRET` | Randômico | Randômico Seguro | Randômico 64 bytes | **SIM** | Vercel Secret |
| `GEMINI_API_KEY` | Dev Key | Staging Key | Prod Key | **SIM** | Vercel Secret |
| `SUPABASE_URL` | Dev Project URL | Staging Project URL | Prod Project URL | Não | `.env` / Vercel |
| `SUPABASE_ANON_KEY` | Dev Key | Staging Key | Prod Key | Não | `.env` / Vercel |
| `SUPABASE_SERVICE_ROLE_KEY`| Dev Key | Staging Key | Prod Key | **SIM** | Vercel Secret (Server Only) |
| `SUPABASE_JWT_SECRET` | Dev Secret | Staging Secret | Prod Secret | **SIM** | Vercel Secret |
| `DATABASE_URL` | Local/Dev URL | Staging DB URL | Prod DB URL | **SIM** | Supabase CLI / Secret |
| `AGENT_REGISTRATION_SECRET`| Dev Secret | Staging Secret | Prod Secret | **SIM** | Vercel & Agent Config |
| `AGENT_TOKEN_SECRET` | Dev Secret | Staging Secret | Prod Secret | **SIM** | Vercel Secret |
| `AGENT_WS_ENDPOINT` | `ws://localhost:3000` | `wss://staging...` | `wss://app.workpulse.com.br` | Não | Agent Config |
| `SECURITY_HMAC_SECRET` | Dev Secret | Staging Secret | Prod Secret | **SIM** | Vercel Secret |
| `BACKUP_MASTER_KEY` | Local Dev Key | Staging Key | Prod Key | **SIM** | Agent Vault (Data Plane) |
| `BACKUP_S3_ACCESS_KEY_ID` | Test S3 Key | Staging Bucket Key | Prod Bucket Key | **SIM** | Agent Vault (Data Plane) |
| `BACKUP_S3_SECRET_ACCESS_KEY`| Test S3 Secret | Staging Secret | Prod Secret | **SIM** | Agent Vault (Data Plane) |
| `SOC_ALERT_WEBHOOK_URL` | N/A | Staging Slack | Prod PagerDuty/Slack | **SIM** | Vercel Secret |

---

## 3. Classificação de Segurança dos Segredos

1. **Frontend-Safe**: Variáveis expostas no bundle do cliente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_URL`). Não contêm chaves de leitura total do banco nem credenciais de storage.
2. **Backend-Only (Control Plane)**: Variáveis de uso exclusivo das Serverless Functions / Express (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SESSION_SECRET`, `GEMINI_API_KEY`, `SECURITY_HMAC_SECRET`).
3. **Agent-Only & Engine-Only (Data Plane)**: Segredos que **JAMAIS** trafegam pelo Vercel ou pelo browser (`BACKUP_MASTER_KEY`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_SMB_PASSWORD`, `BACKUP_SFTP_PRIVATE_KEY`). Armazenados em DPAPI no Windows, SecretService no Linux ou cofre seguro de credenciais local.
