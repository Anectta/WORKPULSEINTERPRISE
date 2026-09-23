# Arquitetura Desktop (Tauri) — WorkPulse Enterprise

## 1. Visão Geral

A aplicação desktop do WorkPulse Enterprise é construída utilizando o ecossistema **Tauri** (Rust + WebView + React), proporcionando um executável nativo leve e seguro.

---

## 2. Isolamento e Comunicação Local

- **Zero dependência de Vercel para execução local**: A aplicação desktop pode operar totalmente isolada ou conectada ao Control Plane SaaS.
- **Comunicação com o Agent**: A UI do Desktop comunica-se com o Backup Agent local através de um canal IPC seguro (Named Pipe no Windows ou Unix Domain Socket no Linux/macOS) utilizando autenticação de token local.
- **Segurança Tauri**:
  - Content Security Policy (**CSP**) restritiva.
  - Permissões explícitas no `tauri.conf.json`.
  - Sem injeção de shell arbitrária.
  - Execução protegida com isolamento de privilégios.

---

## 3. Empacotamento Multiplataforma

O desktop é compilado para:
- **Windows**: Instalador MSI e binário executável assinado com certificado Authenticode.
- **Linux**: Pacotes `.deb`, `.rpm` e `.AppImage`.
- **macOS**: Pacote `.dmg` assinado com Notarization da Apple.
