# MATRIZ DE AMBIENTES E VARIÁVEIS — WORKPULSE ENTERPRISE

## 1. Ciclo de Promoção de Ambientes

```text
[ LOCAL ] ──▶ [ DEVELOPMENT ] ──▶ [ STAGING ] ──▶ [ PRODUCTION ]
```

- **LOCAL**: Executado na máquina do desenvolvedor via `npm run dev` com banco local ou branch de dev no Supabase.
- **DEVELOPMENT**: Branch `develop` no GitHub, deploy automático de preview no Vercel com banco de desenvolvimento.
- **STAGING**: Branch `release/*`, espelho estrito de produção com testes automatizados obrigatórios de regressão e segurança.
- **PRODUCTION**: Branch `main`, aprovada após aprovação em todas as etapas da suíte de CI/CD.

---

## 2. Tabela de Variáveis de Ambiente

| Nome da Variável | Finalidade | Ambiente | Obrigatória? | Onde Configurar |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Define modo de execução (development/production) | Todos | SIM | Vercel / Container |
| `PORT` | Porta de escuta do servidor HTTP (3000) | Local / Container | SIM | Container Runtime |
| `APP_URL` | URL base canônica para links e callbacks | Todos | SIM | Vercel Environment |
| `GEMINI_API_KEY` | Chave de IA para relatórios de produtividade | Todos | Opcional | Vercel / Container |
| `SUPABASE_URL` | URL do projeto Supabase | Stg / Prod | SIM | Vercel / Container |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase para o client | Stg / Prod | SIM | Vercel Environment |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave com permissão administrativa no banco | Stg / Prod | SIM | Vercel Serverless Secrets |
| `SUPABASE_JWT_SECRET` | Segredo para validação de JWTs das sessões | Stg / Prod | SIM | Vercel Serverless Secrets |
| `SECURITY_HMAC_SECRET` | Chave HMAC SHA-256 para assinatura de auditoria | Stg / Prod | SIM | Vercel / Security Engine |
| `REDIS_URL` | Conexão para Fila de Jobs assíncronos | Stg / Prod | SIM | Security Engine Worker |
| `SECURITY_ENGINE_URL` | Endpoint da Engine de Segurança dedicada | Stg / Prod | SIM | Vercel Environment |
| `SECURITY_ENGINE_API_KEY` | Token de autenticação mútua da API com Engine | Stg / Prod | SIM | Vercel / Security Engine |
| `SECURITY_RUNNER_AUTH_TOKEN` | Token para handshake seguro do Runner | Stg / Prod | SIM | Security Engine / Runner |
| `SECURITY_SAFE_MODE` | Restrição de payloads não-destrutivos (true) | Stg / Prod | SIM | Security Engine |
