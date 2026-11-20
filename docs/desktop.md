# Aplicação Desktop — estado atual

> **Atualizado na auditoria de 20/11/2026.** A versão anterior deste documento descrevia
> um aplicativo desktop Tauri (MSI, `.deb`, `.dmg`, IPC por Named Pipe) que **não existe
> no repositório**.

## Como o WorkPulse roda hoje

O WorkPulse Enterprise é uma **aplicação web**:

- **Front-end:** React 19 + Vite (`src/`), servida pelo próprio servidor.
- **Servidor:** Node.js/Express (`server.ts`, porta 3000), que expõe a API em `/api`.
- **Banco de dados:** Supabase (PostgreSQL + Auth).

O acesso é pelo navegador (`http://<servidor>:3000`). Não há executável instalável,
empacotamento Tauri/Electron nem `tauri.conf.json`.

## Componentes que executam nas estações

| Componente | Estado |
|---|---|
| Agente de inventário (scripts PowerShell/Bash gerados na aba LGPD/GPO) | Enviam dados à API com enrollment token gerado em CMDB > API de Agentes |
| Agente de backup (`src/backup-agent`) | Código e testes existem, mas **não há control plane no servidor** nem empacotamento: não está pronto para implantação |

## Se uma versão desktop for necessária

Seria um projeto novo, com pelo menos:

1. Empacotamento (Tauri ou Electron) da SPA existente.
2. Configuração do endereço do servidor e autenticação via Supabase no app.
3. Assinatura de código (Authenticode, Apple Notarization) e pipeline de build no CI.
