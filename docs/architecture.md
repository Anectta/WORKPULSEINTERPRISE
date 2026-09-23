# Arquitetura do Sistema — WorkPulse Enterprise & Backup Platform

## 1. Visão Geral e Separação de Planos

O sistema é rigorosamente dividido em dois planos independentes com responsabilidades claras:

```text
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
      Agent
       ↕
     Engine
       ↓
    Storage
```

---

## 2. Control Plane (Vercel & Supabase)

O **Control Plane** é o plano de controle administrativo centralizado na nuvem:

- **Hospedagem Frontend & BFF**: Vercel (Edge Network + Serverless Functions).
- **Hospedagem Banco & Auth**: Supabase (PostgreSQL com Row Level Security habilitado).
- **Responsabilidades**:
  - Painel de Gestão e Dashboard com ergonomia visual (Off-white `#F5F5F7` / `#F8F9FA`).
  - Autenticação e Autorização de Usuários (RBAC: Admin, Operator, Viewer).
  - Configuração e agendamento de políticas de backup (`backup_jobs`).
  - Catálogo centralizado de metadados, snapshots e integridade.
  - Orquestração de comandos remotos (`agent_commands`) assinados com HMAC.
  - Recepção de telemetria e alertas em tempo real.
  - Trilha imutável de auditoria com assinatura encadeada.

---

## 3. Data Plane (Agent & Engine)

O **Data Plane** é o plano de dados operacional, executado nos nós onde os arquivos residem:

- **Hospedagem**: Servidores gerenciados on-premises, instâncias cloud ou desktops dos usuários (Windows Service, Linux Daemon ou Tauri Desktop).
- **Responsabilidades**:
  - Varredura de sistemas de arquivos locais ou de rede.
  - Processamento de streaming de dados.
  - Compressão de alta velocidade (Zstandard / Deflate).
  - Criptografia autenticada em nível de bloco (AES-256-GCM com AEAD e chave derivada via Argon2id / PBKDF2).
  - Resolução de cadeias de backup (Full, Incremental, Diferencial, Mirror, Two-Way Sync).
  - Aplicação de políticas de retenção GFS e Safe Delete local.
  - Transferência direta e atômica para Provedores de Armazenamento (Local, SMB, SFTP, AWS S3).
  - Funcionamento resiliente offline através de filas de spooling locais.

---

## 4. Comunicação entre Planos (Bridge Segura)

A comunicação entre o Control Plane e o Data Plane ocorre exclusivamente por:

1. **Conexão Segura Duplex**: WebSocket seguro (`wss://`) ou HTTPS com autenticação mútua (Token HMAC / Certificado mTLS).
2. **Assinatura de Comandos**: Todo comando despachado pelo Control Plane (`RunBackup`, `RunRestore`, etc.) possui assinatura digital HMAC-SHA256, prazo de expiração (`expiresAt`) e validação de parâmetros contra injeções.
3. **Isolamento de Dados do Usuário**: Os blocos brutos dos backups do cliente nunca trafegam pelo Control Plane (Vercel). O streaming ocorre diretamente do Engine para o Storage Provider configurado.
