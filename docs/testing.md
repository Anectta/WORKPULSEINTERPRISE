# Estratégia e Suítes de Testes Automatizados — WorkPulse Enterprise

## 1. Visão Geral da Camada de Testes

O projeto implementa uma suíte de testes de validação contínua e resiliência (Etapa 14), organizada em 12 suítes independentes:

1. **Storage Providers Suite**: Validação de upload atômico, download, streaming, integridade SHA-256 e proteção contra Path Traversal em todos os providers (Local, SMB, SFTP, S3).
2. **Compression & Encryption Suite**: Verificação de compressão ZSTD/Deflate, cifra de bloco AES-256-GCM, tags de autenticação AEAD e proteção contra injeção ou truncamento de fluxo criptográfico.
3. **Engine Core Pipelines**: Execução de jobs completos nos modos Full, Incremental, Diferencial, Mirror e Two-Way Sync com verificação de manifestos.
4. **Queue, Scheduler & Retry**: Teste de filas com prioridade, políticas de re-tentativa com backoff exponencial e agendamentos cron.
5. **Restore, Integrity & GFS Retention**: Restauração pontual e completa, reconciliação de integridade e retenção com retenção de leases concorrentes.
6. **Agent Lifecycle & Daemons**: Gerenciamento de ciclo de vida, transições de estado, supervisão de processos, isolamento em daemons Linux e serviços Windows.
7. **Control Plane Integration & Offline Spooling**: Resiliência da conexão WebSocket, detecção de queda de link, enfileiramento em spooling local e drenagem FIFO após reconexão.
8. **End-to-End Operational Lifecycle**: Simulação pontual do fluxo completo: Configuração no SaaS ──► Comando ──► Execução no Agent ──► Armazenamento ──► Telemetria.
9. **Failure Injection & System Resilience**: Injeção intencional de falhas de I/O, corrupção simulada de cabeçalhos de bloco, interrupção forçada com `CancellationToken` e recuperação pós-falha.
10. **Concurrency, Deadlock & Stress Testing**: Execução concorrente de múltiplos jobs em paralelo sem condições de corrida nem deadlocks de recursos.
11. **Security Hardening, RLS & Pentest**: Validação de isolamento multi-tenant via RLS, sanitização de comandos remotos, autenticação HMAC e auditoria imutável (WORM).
12. **Performance Benchmarking & SLOs**: Validação dos objetivos de nível de serviço: throughput sustentado > 15 MB/s, uso de memória RSS < 250 MB e latência de despacho < 100ms.

---

## 2. Execução dos Testes

```bash
# Executa a suíte master com todas as 12 suítes
npm run test
```

A suíte compila e valida **158 testes** com 100% de aprovação antes de qualquer liberação para produção.
