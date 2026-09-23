# GUIA DE DIAGNÓSTICO E TROUBLESHOOTING — WORKPULSE ENTERPRISE

## 1. Problemas Frequentes e Soluções

### A. Erro 403 / SSRF Rejection ao Iniciar Scan
- **Sintoma**: `API_SECURITY_002: Alvo rejeitado por política Anti-SSRF.`
- **Causa**: O endereço IP resolvido pertence a uma faixa privada (RFC 1918) ou metadados de nuvem.
- **Solução**: Verifique se o FQDN aponta para um endereço público válido ou configure um escopo de rede corporativa interna explícito com perfil de autorização assinado.

### B. Runner Não Responde / Timeout no Pentest
- **Sintoma**: Status do projeto de pentest permanece em `RUNNING` sem atualização de progresso.
- **Causa**: Worker perdeu conectividade ou o host de destino bloqueou pacotes no firewall.
- **Solução**:
  1. Verifique `/api/health/runner` para checar o status do worker.
  2. Utilize o botão **Kill Switch / Parada de Emergência** no painel de pentests para forçar a liberação do lock.

### C. Falha de Permissão no Banco (Supabase RLS)
- **Sintoma**: Consultas retornam arrays vazios `[]` mesmo com dados gravados.
- **Causa**: O token JWT do usuário não contém a claim `tenant_id` ou o usuário está logado com tenant diferente do registro.
- **Solução**: Verifique se o header `Authorization: Bearer <token>` está presente e inspecione as claims do JWT através de `public.get_current_tenant_id()`.
