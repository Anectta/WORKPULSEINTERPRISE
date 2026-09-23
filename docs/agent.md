# Arquitetura do Backup Agent — WorkPulse Data Plane

## 1. Visão Geral

O **WorkPulse Backup Agent** é o serviço responsável pela gestão de ciclo de vida e orquestração local no nó cliente (Data Plane).

Ele é projetado para operar como:
- **Serviço Windows** (`windows-service.ts`)
- **Daemon Linux** (`systemd` / `linux-daemon.ts`)
- **Instância Embutida Desktop** (Tauri Desktop App)

---

## 2. Componentes Internos do Agent

```text
[Control Plane SaaS]
        ↕ (WebSocket seguro / HTTPS)
[Control Plane Client]
        ↕
[Command Dispatcher] ──► [Token Manager] (HMAC verification)
        ↕
[Engine Supervisor]  ──► [Circuit Breaker] (Anti-Crash)
        ↕ (IPC Local: Socket Unix / Named Pipe)
[Backup Engine Core] ──► [Filesystem & Storage]
        ↕
[Spool Queue & Deduplication Store] (Offline Resilience)
```

---

## 3. Resiliência Offline & Spooling

Quando a conectividade com o Control Plane SaaS é interrompida:
1. O Agent continua executando agendamentos locais definidos no cache seguro (`state-store.ts`).
2. Todos os eventos de telemetria, conclusões de jobs e logs de auditoria são enfileirados em disco na fila de spooling (`spool-queue.ts`).
3. Ao restabelecer a conexão WebSocket, a estratégia de reconexão exponencial (`reconnect-strategy.ts`) drena a fila de spool em estrita ordem FIFO sem perda de eventos.

---

## 4. Comunicação Segura & Autenticação do Agente

- O Agent **nunca** utiliza credenciais de usuário comum.
- O provisionamento inicial utiliza um token de registro de uso único (`agent_registration_token`).
- O Agent estabelece uma chave de sessão efêmera assinada e recebe um identificador único de máquina (`machineId` calculado via hash estável de hardware).
- Todo comando remoto (`RemoteCommand`) recebido do SaaS tem sua assinatura HMAC validada antes de ser despachado para o Engine.
