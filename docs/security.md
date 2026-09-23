# Arquitetura e Diretrizes de Segurança — WorkPulse Enterprise

## 1. Postura Zero-Knowledge e Isolamento Arquitetural

A plataforma adota o princípio de conhecimento zero (*Zero-Knowledge*) e *Zero Trust Architecture (ZTA)*:
* **Isolamento de Planos**: O Control Plane (Vercel e Supabase) gerencia políticas, agendamentos e metadados. O conteúdo bruto dos arquivos do cliente reside e é processado exclusivamente no Data Plane (máquinas locais e storage privado do cliente).
* **Segredos Efêmeros**: As chaves criptográficas de criptografia e senhas existem apenas na memória volátil do processo durante o período estrito de execução do job ou restore.
* **Memória Protegida (Zeroization)**: Buffers de chaves e vetores criptográficos na memória RAM são sobrepostos com zeros (`keyBuffer.fill(0)`) imediatamente após o uso.

---

## 2. Padrões Criptográficos Adotados

| Mecanismo | Algoritmo / Especificação | Finalidade |
| :--- | :--- | :--- |
| **Cifra de Dados** | AES-256-GCM (Authenticated Encryption with Associated Data) | Confidencialidade e integridade criptográfica de cada bloco |
| **Geração de IV/Nonce** | CSPRNG 12 bytes aleatório por chunk | Proteção contra reuso de IV e ataques de colisão |
| **Derivação de Chaves (KDF)** | PBKDF2 (100.000 iterações, SHA-512) ou Argon2id | Resistência contra ataques de dicionário e força bruta por GPU/ASIC |
| **Integridade de Bloco** | SHA-256 (32 bytes) por chunk + Hash de Manifesto | Detecção pontual de corrupção ou bit-rot em repouso |
| **Assinatura de Comandos** | HMAC-SHA256 com segredo efêmero do nó | Validação de autenticidade de comandos do SaaS para o Agent |
| **Trilha de Auditoria** | HMAC-SHA256 encadeado (Blockchain-like WORM) | Detecção de adulteração ou deleção de logs de auditoria |

---

## 3. Isolamento Multi-Tenant no Banco (PostgreSQL RLS)

Todas as consultas ao banco de dados Supabase são filtradas pelo `tenant_id` extraído criptograficamente do JWT do usuário ou do cabeçalho autenticado do agente. Triggers nativos bloqueiam qualquer tentativa de modificação nos logs de auditoria corporativos (`BEFORE UPDATE OR DELETE RAISE EXCEPTION`).

---

## 4. Proteção contra Ataques Conhecidos

| Vetor de Ataque | Mitigação Implementada |
| :--- | :--- |
| **Replay Attack** | Timestamps estritos com tolerância de 60s e nonces descartáveis em comandos de agentes |
| **Path Traversal** | Sanitização rigorosa via `StoragePathNormalizer` em todas as operações de I/O |
| **Truncamento de Fluxo** | Flag explícito `isLastChunk` e contagem de blocos assinada no manifesto |
| **SSRF (Server-Side Request Forgery)** | Bloqueio de conexões para IPs privados (RFC 1918), loopback e metadata de cloud em varreduras ativas |
| **Deleção Acidental / Sabotagem** | Mecanismo de *Safe Delete* e quarentena de retenção de snapshots ativos |

---

## 5. Política de Divulgação Responsável de Vulnerabilidades

Caso você identifique uma vulnerabilidade de segurança:
- **E-mail de Contato**: security@workpulse.com.br
- Não divulgue publicamente a vulnerabilidade antes de nosso time de SecOps aplicar a correção.
- Nossa equipe acusará o recebimento em até 24 horas.
