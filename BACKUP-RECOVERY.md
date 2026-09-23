# POLÍTICA DE BACKUP E RECUPERAÇÃO DE DESASTRES (DRP)

## 1. Métricas de Resiliência

- **RPO (Recovery Point Objective)**: Máximo de 1 hora (Backups contínuos via WAL e snapshots diários no Supabase).
- **RTO (Recovery Time Objective)**: Máximo de 2 horas para restauração completa da infraestrutura.

---

## 2. Rotinas de Backup

### A. Banco de Dados (Supabase PostgreSQL)
- **Snapshots Diários**: Executados automaticamente às 03:00 UTC com retenção de 30 dias.
- **Point-in-Time Recovery (PITR)**: Habilitado para restauração granular até o segundo.

### B. Evidências e Relatórios (Supabase Storage)
- Armazenamento com replicação multi-região.
- Retenção mínima de 5 anos para trilha de auditoria e conformidade regulatória (LGPD / ISO 27001).

---

## 3. Procedimento de Restauração (Disaster Recovery)

1. Provisionar novo cluster no Supabase ou restaurar snapshot no painel.
2. Executar script de validação de integridade criptográfica da tabela de auditoria (`security_audit_logs`).
3. Validar se os hashes SHA-256 das evidências coincidem com os metadados do banco.
4. Apontar as variáveis de ambiente `DATABASE_URL` e `SUPABASE_URL` no Vercel e reiniciar os serviços.
