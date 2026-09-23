# Gerenciamento de Chaves e Derivação (KDF) — WorkPulse Backup Engine

## 1. Arquitetura de Chaves: KEK e DEK (Envelope Encryption)

O Engine adota a arquitetura de envelope criptográfico de dois níveis:

```text
Senha do Usuário / Master Key
            │
            ▼ (KDF: Argon2id ou PBKDF2 com Salt Criptográfico)
   Key Encryption Key (KEK - 256 bits)
            │
            ▼ (AES-256-GCM Key Wrap com IV e Auth Tag)
   Data Encryption Key (DEK - 256 bits aleatória por backup)
            │
            ▼ (AES-256-GCM Chunked)
   Criptografia dos Dados do Backup
```

### Justificativas Técnicas:
1. **Isolamento de Chaves:** Cada backup ou conjunto de arquivos possui uma DEK própria e independente (`generateDek()`).
2. **Rotação de Senha Instantânea:** Caso o usuário deseje alterar a senha do backup, NÃO é necessário recriptografar terabytes de dados no storage. Basta derivar uma nova KEK a partir da nova senha e re-envolver (*re-wrap*) as DEKs armazenadas no cabeçalho do arquivo ou catálogo.
3. **Múltiplos Backups:** Backup A e Backup B utilizam DEKs diferentes, identificadas publicamente por seu `keyId` (UUID).

## 2. Derivação de Chave (KDF)

### 2.1 Argon2id (Padrão Recomendado)
* **Tipo:** Argon2id (híbrido entre Argon2d e Argon2i, oferecendo resistência combinada contra ataques baseados em cache e ataques massivos por hardware paralelo GPU/ASIC).
* **Parâmetros:**
  - `memoryCost`: 16.384 KB a 65.536 KB (16 a 64 MB de memória alocada dinamicamente).
  - `timeCost`: 3 iterações.
  - `parallelism`: 1 a 4 threads de execução.
  - `outputLength`: 32 bytes (256 bits).
* **Salt Criptográfico:** Gerado exclusivamente via `crypto.randomBytes(32)`. NUNCA reutilizado e NUNCA derivado de dados estáticos como nome de usuário ou ID de job.

### 2.2 PBKDF2 (Padrão de Compatibilidade)
* **Algoritmo:** HMAC-SHA256.
* **Iterações:** 100.000 iterações (em conformidade com as diretrizes do NIST SP 800-132).
* **Output:** 32 bytes (256 bits).

## 3. Higiene de Memória e Proteção de Segredos (Zeroization)

1. **Senhas NUNCA são persistidas:** Nenhuma senha é gravada em bancos de dados, arquivos de log, manifestos de backup ou metadados de catálogo.
2. **Limpeza Explícita de Buffers:** Através do método `destroyKey(buf)`, buffers contendo material de chaves derivadas em memória são sobrescritos com zeros (`buf.fill(0)`) logo após sua utilização nos ciphers.
3. **Prevenção de Vazamento em Logs:** O tratamento de erros de criptografia sanitiza mensagens e stack traces para que nenhuma chave, senha ou token seja impresso.
