# PROCEDIMENTO DE ROLLBACK EM PRODUÇÃO — WORKPULSE ENTERPRISE

## 1. Fluxo de Decisão de Rollback

```text
[ Deploy de Nova Versão ]
           │
           ▼
[ Health Check Automatizado ]
           │
     ┌─────┴─────┐
     ▼           ▼
  [ Sucesso ] [ Falha / Erro 5xx ]
     │           │
     ▼           ▼
[ Smoke Tests ] [ ROLLBACK IMEDIATO ]
```

---

## 2. Passo a Passo de Reversão

### A. Frontend e API (Vercel)
1. Acesse o painel da **Vercel** > **Deployments**.
2. Localize o último deployment estável anterior.
3. Clique em **Instant Rollback** para reverter o tráfego em 100% de forma imediata.

### B. Banco de Dados (Supabase)
- **Migrations Não-Destrutivas**: O modelo adota a estratégia de *Expand and Contract*, garantindo que colunas antigas não sejam excluídas na mesma versão em que o código novo é implantado.
- Se uma migration introduzir instabilidade, execute o script de reversão específico disponibilizado na pasta `/supabase/migrations/rollback/`.

### C. Security Engine e Runner
- Reative a versão anterior da imagem Docker no Cloud Run apontando para a tag de imagem prévia (`gcr.io/.../sec-engine:vX.Y.Z-stable`).
