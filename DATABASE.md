# MODELO DE DADOS E POLÍTICAS RLS (SUPABASE POSTGRESQL)

## 1. Dicionário de Tabelas do Módulo Security & Pentest

1. `public.security_scopes`: Governança e autorização formal de escopos de auditoria e testes.
2. `public.security_policies`: Parâmetros técnicos de execução (rate limit, safe mode, janelas de horário).
3. `public.security_targets`: Ativos e URLs autorizados para testes vinculados ao escopo e CIs do CMDB.
4. `public.pentest_projects`: Projetos de pentest com metodologia (OWASP WSTG, PTES, NIST).
5. `public.pentest_executions`: Execuções rastreadas em tempo real com métricas e progresso.
6. `public.pentest_execution_logs`: Logs de execução detalhados por etapa de teste.
7. `public.security_scans`: Varreduras automatizadas de vulnerabilidades e conformidade.
8. `public.security_findings`: Vulnerabilidades identificadas com pontuação CVSS v3.1, CWE e severidade.
9. `public.security_evidences`: Evidências técnicas coletadas com hash SHA-256 e sanitização.
10. `public.security_remediations`: Planos de ação de correção vinculados a chamados de TI com controle de SLA.
11. `public.accepted_risks`: Registro formal de aceite de risco e controles compensatórios com expiração.
12. `public.retest_comparisons`: Resultados comparativos antes vs. depois da aplicação de patches.
13. `public.security_reports`: Relatórios executivos e técnicos com selo digital.
14. `public.report_share_tokens`: Tokens seguros com controle de expiração e contagem de acessos.
15. `public.security_audit_logs`: Trilha imutável com assinatura HMAC e proteção contra adulteração.

---

## 2. Matriz de Permissões RLS por Role

| Role / Ator | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `SECURITY_ADMIN` | Permitido (Tenant) | Permitido (Tenant) | Permitido (Tenant) | Restrito por regras de negócio |
| `SECURITY_OPERATOR` | Permitido (Tenant) | Permitido (Scans/Findings) | Permitido (Remediações) | Bloqueado |
| `SECURITY_AUDITOR` | Permitido (Read-Only) | Bloqueado | Bloqueado | Bloqueado |
| `SECURITY_VIEWER` | Permitido (Dashboards) | Bloqueado | Bloqueado | Bloqueado |
| `SERVICE_ROLE` | Acesso Total (Bypass RLS para Workers autorizados) | Acesso Total | Acesso Total | Acesso Total |

---

## 3. Gestão de Migrations

Todas as alterações estruturais são gerenciadas através de arquivos SQL versionados dentro de `/supabase/migrations/`:
- `20260910000000_security_pentest_production.sql`
