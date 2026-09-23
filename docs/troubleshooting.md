# Guia de Resolução de Problemas (Troubleshooting) — WorkPulse Enterprise

## 1. Problemas Comuns e Diagnósticos

### 1.1 "WebSocket Connection Failed" no Agent
- **Sintoma**: O Agent registra logs de falha contínua ao tentar conectar ao WebSocket do Control Plane.
- **Causa Raiz**: URL `AGENT_WS_ENDPOINT` incorreta, certificado SSL inválido ou bloqueio de proxy intermediário na porta 443.
- **Resolução**:
  1. Verifique se o endereço começa com `wss://` em produção ou `ws://` em desenvolvimento local.
  2. Teste a conectividade: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://app.workpulse.com.br/api/v1/agents/ws`.
  3. Verifique se o firewall corporativo permite tráfego de WebSocket persistente.

---

### 1.2 "CRYPTO_CORRUPTED_TAG" Durante Restauração
- **Sintoma**: A restauração é abortada com código de erro de integridade de autenticação.
- **Causa Raiz**: O arquivo de backup no storage foi modificado, corrompido ou uma senha/chave de descriptografia incorreta foi fornecida.
- **Resolução**:
  1. O algoritmo AES-256-GCM rejeita blocos alterados por garantia matemática.
  2. Confirme se a senha ou KEK fornecida é idêntica à utilizada no momento do backup.
  3. Verifique os logs de auditoria do storage para identificar alterações indevidas no arquivo de container.

---

### 1.3 "RLS Policy Violation" ao Acessar Registros no Supabase
- **Sintoma**: Usuário autenticado recebe lista vazia ou erro 403 ao consultar jobs ou agentes.
- **Causa Raiz**: O token JWT do usuário não contém a claim `tenant_id` em `app_metadata` ou `user_metadata`.
- **Resolução**:
  1. Verifique o payload do JWT emitido pelo Supabase Auth.
  2. Assegure-se de que o usuário possui o atributo `tenant_id` configurado no cadastro de usuários corporativos.

---

### 1.4 Backup Lento ou Alto Uso de I/O
- **Sintoma**: O processo de backup consome alta utilização de disco ou rede local.
- **Causa Raiz**: Nível de compressão ZSTD muito alto para CPU modesta ou volume massivo de pequenos arquivos sem paralelismo adequado.
- **Resolução**:
  1. Ajuste o nível de compressão na política do job para `ZSTD_LEVEL_1` ou `ZSTD_LEVEL_3` (otimizado para streaming contínuo).
  2. Configure exclusões de arquivos temporários, caches de navegadores e logs nos filtros de inclusão/exclusão.
