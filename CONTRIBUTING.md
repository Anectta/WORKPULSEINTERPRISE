# Guia de Contribuição — WorkPulse Enterprise & Backup Engine

Obrigado pelo seu interesse em contribuir com a plataforma **WorkPulse Enterprise & Backup Engine**.

Este documento estabelece as diretrizes de desenvolvimento, padrões de codificação, arquitetura de separação de planos e o fluxo de trabalho de pull requests.

---

## 1. Princípios Arquiteturais Fundamentais

### 1.1 Separação Estrita entre Planos
- **Control Plane (SaaS / Vercel / Supabase)**: Gestão, API REST, UI React, Autenticação de Usuários, RLS, Auditoria e Telemetria.
- **Data Plane (Agent / Engine)**: Execução local em nós protegidos, acesso direto ao sistema de arquivos, compressão ZSTD/Deflate, criptografia AES-256-GCM, comunicação direta com Provedores de Armazenamento (Local, SMB, SFTP, S3).
- **REGRA DE OURO**: O Backup Engine **JAMAIS** deve ser executado no Vercel, no navegador ou em Supabase Edge Functions. O processamento intensivo de I/O e CPU reside 100% no Data Plane.

### 1.2 Ergonomia Visual (UX/UI Mandate)
- **Nunca utilize fundos em branco puro (`#FFFFFF`)**.
- Utilize preferencialmente tons **Off-white** (`#F5F5F7` ou `#F8F9FA`) para reduzir o contraste agressivo e a fadiga ocular.

---

## 2. Estratégia de Branches

Adotamos o modelo simplificado de Git Flow:

- `main`: Código em produção auditado e testado.
- `develop`: Branch de integração contínua para próximas versões.
- `feature/<nome-curto>`: Novas funcionalidades ou melhorias de componentes.
- `fix/<nome-curto>`: Correções de bugs.
- `release/<versao>`: Estabilização pré-lançamento.

### Regras de Proteção de Branch:
1. Commits diretos na `main` são estritamente bloqueados.
2. Todo Pull Request para `main` ou `develop` requer:
   - Aprovação de code review.
   - Aprovação do pipeline de CI (`npm run lint`, `npm run test`, `npm run build`).
   - 100% de passagem nos testes de resiliência e integridade.

---

## 3. Fluxo de Trabalho Local

```bash
# 1. Clonar o repositório
git clone https://github.com/empresa/workpulse-enterprise.git
cd workpulse-enterprise

# 2. Instalar dependências
npm install

# 3. Configurar ambiente local
cp .env.example .env.local

# 4. Executar verificação de tipos e linter
npm run lint

# 5. Executar suíte completa de testes (12 suítes / 158 testes)
npm run test

# 6. Iniciar servidor de desenvolvimento
npm run dev
```

---

## 4. Padrões de Código e Convenções

- **TypeScript Strict**: Tipagem explícita em todas as assinaturas. Evite `any` sem justificativa técnica documentada.
- **Zeroization**: Chaves e vetores criptográficos em memória devem ser sobrepostos com zeros (`keyBuffer.fill(0)`) imediatamente após o uso.
- **Path Normalization**: Todos os caminhos de arquivo manipulados pelo Storage ou Engine devem passar por `StoragePathNormalizer` para mitigar Path Traversal.
- **Atomics**: Operações de escrita em storage devem utilizar arquivos temporários (`.tmp`) com rename atômico subsequente.

---

## 5. Submissão de Pull Request

1. Certifique-se de que `npm run lint` e `npm run test` foram executados com sucesso.
2. Escreva mensagens de commit convencionais (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
3. Descreva claramente no PR o impacto das alterações e confirme que nenhuma funcionalidade existente foi descontinuada ou regredida.
