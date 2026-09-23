# WORKPULSE AGENT — TELEMETRIA DE ENDPOINTS E INVENTÁRIO

## 1. Visão Geral
O **WorkPulse Agent** é um serviço leve executado nos endpoints e servidores corporativos para coleta contínua de inventário de hardware, software, telemetria e conformidade com a LGPD.

---

## 2. Comunicação e Autenticação

- **Protocolo**: HTTPS (TLS 1.3) com autenticação mútua via Token de Agente (`x-agent-token`).
- **Heartbeat & Telemetria**: Envio a cada 60 segundos com métricas de CPU, memória, portas ativas e lista de softwares instalados.
- **Integração com CMDB**: Dados de inventário são normalizados e atualizam os itens de configuração (CIs) na base central do CMDB.
- **Privacidade LGPD**: O agente não captura telas nem dados pessoais invasivos, limitando-se a metadados operacionais de produtividade e segurança.
