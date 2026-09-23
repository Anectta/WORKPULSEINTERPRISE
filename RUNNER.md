# ISOLATED RUNNER — ESPECIFICAÇÃO DO EXECUTOR ISOLADO DE PENTEST

## 1. Visão Geral
O **Isolated Runner** é o componente responsável pela execução estritamente controlada de pacotes de testes de invasão e auditoria técnica. Ele é provisionado em ambiente efêmero e isolado (sandbox), garantindo que testes não interfiram na integridade de outros sistemas.

---

## 2. Requisitos de Isolamento e Execução

- **Handshake Seguro**: O runner valida tokens criptográficos de execução (`execution_id`, `tenant_id`, `scope_id`, `authorization_hash`) antes de iniciar qualquer teste.
- **Rules of Engagement (RoE)**: Validação automática de horário permitido, limites de banda e alvos autorizados.
- **Kill Switch Instantâneo**: Suporte a cancelamento imediato via chamada a `/api/v1/security/pentest/executions/:id/emergency-stop`.
- **Egress Limit & Sandboxing**: Processos executam sem privilégios de root (`non-root user`) e com saída de rede restrita apenas aos alvos explicitamente informados no escopo.
- **Evidências Digitais**: Coleta de logs, respostas HTTP e banners com cálculo de hash SHA-256 no momento da captura.
