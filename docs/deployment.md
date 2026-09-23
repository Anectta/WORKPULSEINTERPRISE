# Guia de Implantação e Deploy — WorkPulse Enterprise

## 1. Estratégia de Deploy por Componente

| Componente | Destino de Hospedagem | Método de Deploy | Artefatos Gerados |
| :--- | :--- | :--- | :--- |
| **Control Plane (UI + BFF)** | **Vercel** | Git Push para `main` / Vercel CLI | SPA estática em `dist/` + Serverless Functions |
| **Banco de Dados & Auth** | **Supabase** | Supabase CLI (`supabase db push`) | Tabelas PostgreSQL com RLS ativo |
| **Backup Agent (Daemon/Service)** | **Servidores / Nós Locais** | Instalador MSI / RPM / DEB / Docker | Binário compilado ou pacote Node/Rust |
| **Backup Engine** | **Nó Local (Data Plane)** | Embutido no Agent / Bridge IPC | Engine de processamento de I/O local |
| **Desktop App** | **Workstations** | Tauri Bundle (`.msi`, `.dmg`, `.AppImage`) | Aplicação desktop nativa |

---

## 2. Deploy no Vercel (Control Plane)

### 2.1 Configuração do Repositório no Vercel
1. Conecte o repositório GitHub no dashboard da Vercel.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.

### 2.2 Variáveis de Ambiente no Vercel
Configure as seguintes variáveis no painel da Vercel:
- `NODE_ENV=production`
- `APP_URL=https://app.workpulse.com.br`
- `SUPABASE_URL=https://<projeto>.supabase.co`
- `SUPABASE_ANON_KEY=<sua-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>`
- `SUPABASE_JWT_SECRET=<seu-jwt-secret>`
- `SESSION_SECRET=<segredo-de-sessao-64-hex>`
- `GEMINI_API_KEY=<sua-api-key-gemini>`
- `AGENT_REGISTRATION_SECRET=<segredo-de-registro-de-agentes>`
- `AGENT_TOKEN_SECRET=<segredo-hmac-de-tokens-de-agentes>`
- `SECURITY_HMAC_SECRET=<chave-hmac-auditoria>`

---

## 3. Deploy no Supabase

Execute as migrations versionadas através da CLI do Supabase:

```bash
# Login na CLI
supabase login

# Conectar ao projeto
supabase link --project-ref <project-id>

# Aplicar migrations pendentes
supabase db push
```

As migrations criam automaticamente todas as tabelas, índices, triggers de auditoria WORM e habilitam o Row Level Security (RLS) com isolamento por `tenant_id`.

---

## 4. Distribuição do Backup Agent (Data Plane)

O Agent é instalado nas máquinas que terão seus dados salvos:
1. O administrador gera um token de instalação no SaaS.
2. O Agent é provisionado com o comando:
   ```bash
   workpulse-agent install --control-plane https://app.workpulse.com.br --token <REGISTRATION_TOKEN>
   ```
3. O Agent realiza o handshake mTLS/HMAC, estabelece o WebSocket e inicia o monitoramento e execução de jobs locais.
