# Guia de Configuração e Execução no Antigravity IDE

Este documento descreve as etapas para abrir, configurar, desenvolver e depurar o projeto **WorkPulse Enterprise & Backup Engine** diretamente no **Google Antigravity IDE**.

---

## 1. Requisitos do Sistema

- **Runtime**: Node.js LTS v22.x (ou v20.x+)
- **Gerenciador de Pacotes**: npm v10+ (ou pnpm / yarn)
- **Extensões Recomendadas no Antigravity / VSCode**:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features
  - Even Better TOML (para crates Rust/Tauri se compilando o desktop)

---

## 2. Estrutura Reconhecível do Projeto

```text
/
├── apps/                 # Aplicações (SaaS Web e Desktop Tauri)
├── src/                  # Código-fonte principal
│   ├── backup-agent/     # Data Plane: WorkPulse Backup Agent (Lifecycle, IPC, Spooling)
│   ├── backup-engine/    # Data Plane: Core Engine (ZSTD, AES-256-GCM, GFS, S3, SMB, SFTP)
│   ├── components/       # Componentes React da Interface Web
│   └── types/            # Tipos e Contratos TypeScript compartilhados
├── server/               # Control Plane: API Routes, BFF, Handshake e Health Checks
├── supabase/             # Migrations versionadas, RLS e schemas PostgreSQL
├── tests/                # Suítes de testes automatizados (Resiliência, E2E, Hardening, Performance)
├── docs/                 # Documentação técnica e arquitetural consolidada
└── scripts/              # Utilitários de build e master test runner
```

---

## 3. Instalação e Inicialização Local

No terminal do Antigravity IDE:

```bash
# 1. Instalar todas as dependências do projeto
npm install

# 2. Configurar variáveis de ambiente a partir do template
cp .env.example .env.local

# 3. Executar o servidor de desenvolvimento (Vite + Express na porta 3000)
npm run dev
```

O dev server inicializa na porta `3000` (host `0.0.0.0`), permitindo a visualização imediata no webview do Antigravity IDE.

---

## 4. Execução de Testes e Validação

Para validar a integridade completa de todas as camadas (Etapa 14):

```bash
# Executar verificação estática de tipos
npm run lint

# Executar a suíte de testes master (12 suítes, 158 verificações)
npm run test
```

---

## 5. Build de Produção

```bash
# Compila o frontend estático (dist/) e o bundle Node.js CommonJS (dist/server.cjs)
npm run build

# Executar a aplicação compilada em modo produção
npm run start
```

---

## 6. Depuração (Debugging) no Antigravity

Para depuração de breakpoints no servidor ou no motor de backup:

1. Abra a aba **Run & Debug** no Antigravity IDE.
2. Utilize o script `npm run dev` com node inspect:
   ```bash
   npx tsx --inspect server.ts
   ```
3. Conecte o debugger do Antigravity à porta padrão `9229`.

---

## 7. Regras de Isolamento no Antigravity

- **Sem caminhos absolutos locais**: Todo código utiliza `process.cwd()` ou caminhos relativos normalizados via `path.join()`.
- **Sem secrets gravados**: O arquivo `.env.local` é ignorado pelo `.gitignore`.
- **Ausência de arquivos temporários**: Diretórios como `data/spool/`, `data/cache/` e `node_modules/` não devem ser commitados.
