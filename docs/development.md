# Guia de Desenvolvimento — WorkPulse Enterprise

## 1. Configuração do Ambiente Local

### Pré-requisitos
- Node.js 22+
- npm 10+
- Git

### Inicialização Rápida

```bash
# Clone do projeto
git clone https://github.com/empresa/workpulse-enterprise.git
cd workpulse-enterprise

# Instalação das dependências
npm install

# Configuração de variáveis
cp .env.example .env.local

# Execução do ambiente de desenvolvimento (porta 3000)
npm run dev
```

---

## 2. Scripts Disponíveis no `package.json`

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o dev server do Vite integrado ao servidor Express na porta 3000 |
| `npm run lint` | Executa o compilador TypeScript (`tsc --noEmit`) para validação estática |
| `npm run test` | Executa o runner master de testes com todas as 12 suítes automatizadas |
| `npm run build` | Compila o frontend Vite em `dist/` e o backend em `dist/server.cjs` via esbuild |
| `npm run start` | Executa o bundle de produção compilado |
| `npm run clean` | Remove artefatos de compilação anteriores |

---

## 3. Diretrizes de Codificação

1. **Strict Types**: Sempre utilize tipagem estrita no TypeScript. Não use `any` sem documentar o motivo.
2. **Design System & Ergonomia**:
   - Respeite o mandatório de UX: nunca use fundo branco puro (`#FFFFFF`).
   - Use tons Off-white (`#F5F5F7` ou `#F8F9FA`) com Tailwind CSS.
3. **Resiliência e Streams**:
   - Todo processamento de arquivos no motor de backup deve ser executado via streaming com backpressure.
   - Utilize `CancellationToken` para permitir cancelamentos limpos de jobs em execução.
