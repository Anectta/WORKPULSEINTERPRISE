# WorkPulse Enterprise — Produtividade, Compliance LGPD, CMDB & Security Pentest

WorkPulse Enterprise é uma plataforma corporativa integrada de governança de TI, gestão de produtividade, conformidade com a LGPD e módulo nativo de **Security & Pentest** com remediação, hardening, reteste, relatórios executivos selados e gestão estratégica de riscos.

---

## 🚀 Arquitetura Geral & Separação de Planos

O projeto adota uma separação rigorosa entre **Control Plane** (Vercel + Supabase) e **Data Plane** (Agent + Engine local):

```
Antigravity IDE
       ↓
GitHub
       ↓
 ┌─────┴───────────┐
 ↓                 ↓
Supabase          Vercel
Database/Auth     SaaS Frontend/API
       ↕
   Control Plane
       ↕
 HTTPS / WebSocket
       ↕
      Agent (Windows Service / Linux Daemon / Tauri Desktop)
       ↕
   Backup Engine (Streaming, ZSTD, AES-256-GCM, GFS)
       ↓
    Storage (Local / SMB / SFTP / AWS S3)
```

### Separação Estrita de Responsabilidades

| Plano | Camada / Componente | Executa em Vercel? | Responsabilidade Principal |
| :--- | :--- | :---: | :--- |
| **Control Plane** | Frontend React 19, Tailwind CSS, Vite | **SIM** | Interface do usuário corporativa, dashboards e auditoria |
| **Control Plane** | API / BFF Gateway (Node.js/Express) | **SIM** | Autenticação, autorização RBAC, rotas de controle e orquestração |
| **Control Plane** | Supabase (PostgreSQL + RLS + Auth) | **NÃO (Supabase)** | Metadados, catálogo, políticas de jobs, logs de auditoria e RBAC |
| **Data Plane** | Backup Agent (Daemon/Service/Tauri) | **NÃO (Local)** | Gestão de ciclo de vida, spooling offline, bridge IPC |
| **Data Plane** | Backup Engine (Core) | **NÃO (Local)** | Varredura de filesystem, ZSTD, cifra AES-256-GCM, GFS, Safe Delete |
| **Data Plane** | Storage Providers (Local/SMB/SFTP/S3) | **NÃO (Local)** | Transporte direto de chunks para destinos locais ou em nuvem |

> ⚠️ **REGRA CRÍTICA DE ARQUITETURA**: O Backup Engine **JAMAIS** é executado no Vercel, no navegador ou em Supabase Edge Functions. Todo o I/O pesado de backup, restauração, compressão e criptografia permanece estritamente no Data Plane na máquina gerenciada.


---

## 🛠️ Comandos de Desenvolvimento e Produção

```bash
# 1. Instalação das dependências
npm install

# 2. Execução em ambiente de desenvolvimento local (Porta 3000)
npm run dev

# 3. Verificação estática de tipos (TypeScript)
npm run lint

# 4. Execução da suíte automatizada de testes de segurança e E2E
npm run test

# 5. Compilação para produção (Frontend Vite + Backend Bundled cjs)
npm run build

# 6. Inicialização do servidor em produção
npm run start
```

---

## 🌐 Deploy, CI/CD & Integrações em Produção

| Serviço | Provedor / URL | Status | Descrição |
| :--- | :--- | :---: | :--- |
| **Código-Fonte & CI/CD** | [GitHub - Anectta/WORKPULSEINTERPRISE](https://github.com/Anectta/WORKPULSEINTERPRISE) | ✅ Ativo | Repositório oficial com pipeline automatizado via GitHub Actions |
| **Banco de Dados & Auth** | [Supabase Database](https://supabase.com) (`qaeyxuqsvkrovdciuyux`) | ✅ Conectado | PostgreSQL com RLS, GoTrue Auth e migrations versionadas |
| **Hospedagem & CDN Edge** | [Vercel](https://vercel.com) | ✅ Deployed | Deploy contínuo integrado à branch `main` com HTTPS e Vite SPA |
| **Velocímetro Net Pulse** | Módulo Nativo WorkPulse | ✅ Integrado | Cockpit gauge SVG 260°, onda de vazão em tempo real e laudo técnico |

---

## 🔒 Princípios de Segurança (Zero Trust & DevSecOps)

- **NEVER TRUST — ALWAYS VERIFY**: Validação explícita em todas as camadas (Token JWT + Tenant ID + RBAC + RLS no Banco).
- **Isolamento Multi-Tenant**: Nenhuma consulta atinge o banco ou os runners sem a cláusula estrita de `tenant_id`.
- **Validação Anti-SSRF & Scope Check**: Alvos são validados contra IPs privados, loopbacks e cloud metadata antes de qualquer varredura.
- **Trilha de Auditoria Imutável**: Logs de auditoria assinados com HMAC SHA-256 e protegidos contra UPDATE e DELETE no PostgreSQL via triggers nativos.
- **Safe Mode Enforcement**: Restrição estrita a payloads informativos e não-destrutivos durante operações de rotina.
