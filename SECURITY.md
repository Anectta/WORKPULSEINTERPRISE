# POLÍTICA DE SEGURANÇA E DEVSECOPS — WORKPULSE ENTERPRISE

## 1. Princípios Fundamentais de Segurança

1. **Zero Trust Architecture (ZTA)**:
   - Toda requisição deve conter credenciais válidas e contexto de tenant explícito.
   - Nenhuma entidade (inclusive serviços internos) é confiada sem autenticação e autorização prévia.

2. **Isolamento de Tenant no Banco (PostgreSQL RLS)**:
   - Todas as consultas ao banco são filtradas pelo `tenant_id` extraído do JWT criptográfico.
   - Triggers bloqueiam qualquer tentativa de inserção com tenant incompatível.

3. **Proteção Anti-SSRF (Server-Side Request Forgery)**:
   - Nenhum IP da faixa privada (RFC 1918), loopback (`127.0.0.1`), link-local (`169.254.169.254`) ou metadados de nuvem (AWS/GCP/Azure) pode ser alvo de varredura ativa pelo Security Engine ou Runner sem autorização expressa em ambiente corporativo interno.

4. **Trilha de Auditoria com Assinatura Criptográfica HMAC SHA-256**:
   - Cada evento de segurança (criação de escopo, início de scan, aceite de risco, reteste, emissão de relatório) é registrado com assinatura HMAC encadeada ao registro anterior.
   - A tabela `security_audit_logs` é estritamente *Append-Only*, com bloqueio a nível de banco (`BEFORE UPDATE OR DELETE RAISE EXCEPTION`).

5. **Safe Mode Enforcement**:
   - Varreduras de vulnerabilidade operam por padrão em modo passivo/não-destrutivo com rate-limiting controlado (máx 5 req/s por alvo).

6. **Gerenciamento Seguro de Segredos**:
   - Nenhuma chave de API, credencial ou certificado é gravado no repositório de código ou exposto em logs de depuração.

## 2. Divulgação Responsável de Vulnerabilidades

Caso você identifique uma vulnerabilidade de segurança na plataforma WorkPulse Enterprise ou nos módulos de Backup Engine e Agent:

- **E-mail de Contato**: security@workpulse.com.br
- **Não abra issues públicas no GitHub** relatando falhas de segurança exploráveis.
- Forneça detalhes técnicos completos, incluindo passos para reprodução, versão do software e impacto potencial.
- Nosso time de Security Operations (SecOps) acusará o recebimento em até 24 horas e fornecerá atualizações regulares sobre o processo de mitigação e remediação.

