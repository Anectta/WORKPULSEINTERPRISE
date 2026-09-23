# WORKPULSE ENTERPRISE — ARQUITETURA GERAL DO SISTEMA

## 1. Visão Geral e Fluxo de Execução

```text
[ Usuário / Navegador ]
         │
         ▼
[ Vercel Edge / CDN ]
         │ (SPA React 19 + Tailwind)
         ▼
[ API Gateway / Express BFF ]
         │ (JWT Bearer Token + Tenant Isolation + Rate Limit)
         ├────────────────────────────────────────────┐
         ▼                                            ▼
[ Supabase PostgreSQL + RLS ]              [ Redis / BullMQ Job Queue ]
 (Database, Auth, Storage, Audit)                     │
                                                      ▼
                                           [ Security Worker Engine ]
                                           (Dedicated Cloud Run / VM)
                                                      │
                                                      ▼
                                            [ Isolated Runner ]
                                           (Sandboxed Container)
                                                      │
                                                      ▼
                                           [ Target Autorizado ]
```

## 2. Componentes e Tecnologias

### A. Frontend (Vercel)
- **Framework**: React 19 com TypeScript e Vite.
- **Estilização**: Tailwind CSS v4.
- **Componentes**: Lucide React, Recharts para visualizações analíticas, Framer Motion para animações de interface.
- **Execução**: Serverless Edge Hosting na Vercel (Totalmente Stateless).

### B. Backend & API Router (Vercel Serverless / Express Container)
- **Framework**: Express 4.x / Node.js 22.
- **Segurança de Entrada**:
  - Rate Limiting por IP e Tenant (Tokens bucket).
  - Security Headers rígidos (CSP, HSTS, X-Content-Type-Options, Referrer-Policy).
  - RBAC Middleware (Verificação de Roles: `SECURITY_ADMIN`, `OPERATOR`, `AUDITOR`, `VIEWER`).
  - Tenant Context Injector (`x-tenant-id` obrigatório e validado).

### C. Persistência de Dados (Supabase PostgreSQL 15+)
- **Row Level Security (RLS)**: Isolamento obrigatório em nível de registro para todas as 15 tabelas do ecossistema de segurança.
- **Trilha de Auditoria Append-Only**: Assinatura criptográfica HMAC SHA-256 por linha com triggers PostgreSQL que rejeitam qualquer `UPDATE` ou `DELETE`.
- **Integridade Referencial**: Cascades controlados e chaves estrangeiras que impedem exclusão de escopos com projetos ativos.

### D. Security Engine & Isolated Runner (Infraestrutura Dedicada)
- **Nunca executado dentro do ambiente da Vercel** devido a restrições de timeout, sockets persistentes e privilégios de rede.
- **Isolamento de Processos**: Cada varredura/pentest roda com credenciais efêmeras em container fechado.
- **Kill Switch & Circuit Breaker**: O cancelamento emergencial é propagado em tempo real via canal de controle com interrupção instantânea de sockets.
