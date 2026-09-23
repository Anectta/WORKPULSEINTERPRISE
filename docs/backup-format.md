# Formato Binário do Objeto Criptografado — WorkPulse Backup Engine (WPBK v1)

## 1. Estrutura Geral do Container

O container criptografado do WorkPulse Backup Engine utiliza a especificação versionada **WPBK** (*WorkPulse Backup Container v1*):

```text
┌────────────────────────────────────────────────────────┐
│                   CONTAINER HEADER                     │
├──────────────┬──────────────┬──────────────┬───────────┤
│ Magic (4B)   │ Version (2B) │ HdrLen (4B)  │ Tag (16B) │
│ "WPBK"       │ 0x0001       │ uint32BE     │ HMAC Tag  │
├──────────────┴──────────────┴──────────────┴───────────┤
│            Payload JSON do Header (HdrLen bytes)       │
├────────────────────────────────────────────────────────┤
│                 SEQUÊNCIA DE CHUNKS                    │
├────────────────────────────────────────────────────────┤
│ CHUNK #0:                                              │
│   - chunkIndex: uint32BE (0)                           │
│   - isLastChunk: uint8 (0)                             │
│   - cipherTextLength: uint32BE                         │
│   - chunkIv: 12 bytes                                  │
│   - authTag: 16 bytes (AES-GCM)                        │
│   - cipherText: [bytes]                                │
├────────────────────────────────────────────────────────┤
│ CHUNK #1:                                              │
│   - chunkIndex: uint32BE (1)                           │
│   - isLastChunk: uint8 (0)                             │
│   ...                                                  │
├────────────────────────────────────────────────────────┤
│ CHUNK #N (Final):                                      │
│   - chunkIndex: uint32BE (N)                           │
│   - isLastChunk: uint8 (1)                             │
│   ...                                                  │
└────────────────────────────────────────────────────────┘
```

## 2. Especificação do Header

1. **Magic Bytes (4 bytes):** `0x57 0x50 0x42 0x4B` (`"WPBK"`). Permite identificação unívoca do tipo de arquivo e rejeição imediata de arquivos incompatíveis.
2. **Format Version (2 bytes uint16BE):** Versão do formato. Versão atual: `1`.
3. **Header Length (4 bytes uint32BE):** Tamanho em bytes do JSON de metadados.
4. **Header Payload (UTF-8 JSON):**
   * `algorithm`: `"AES_256_GCM"`
   * `keyId`: Identificador público não-secreto da chave (UUID).
   * `kdf`: Estrutura com algoritmo (`"ARGON2ID"` ou `"PBKDF2"`) e parâmetros de derivação.
   * `saltHex`: Salt criptográfico de 32 bytes (hexadecimal).
   * `wrappedDekHex`: DEK criptografada pela KEK.
   * `wrappedDekIvHex`: IV de 12 bytes usado para proteger a DEK.
   * `wrappedDekTagHex`: Tag GCM de 16 bytes da DEK.
   * `chunkSizeBytes`: Tamanho dos blocos de dados.
   * `originalSizeBytes`: Tamanho original do arquivo em bytes.
   * `originalSha256`: Hash SHA-256 do arquivo em texto plano.
   * `compressedSizeBytes`: Tamanho após compressão (opcional).
   * `compressedSha256`: Hash do payload comprimido (opcional).
   * `compressionAlgorithm`: `"ZSTD"`, `"ZIP"` ou `"NONE"`.
   * `compressionLevel`: Nível do compressor.
   * `createdAt`: Timestamp ISO 8601 da criação do container.
5. **Header Tag (16 bytes):** Tag de autenticação HMAC-SHA256 gerada com a DEK sobre o payload JSON, impedindo adulteração de metadados do cabeçalho.

## 3. Especificação do Chunk

Cada chunk possui um cabeçalho estrito de 37 bytes:
* `chunkIndex` (4 bytes uint32BE): Começa em `0` e incrementa em `1` a cada bloco. Rejeita blocos fora de ordem ou duplicados.
* `isLastChunk` (1 byte uint8): `0` para blocos intermediários; `1` para o bloco final. Impede truncamento silencioso do arquivo.
* `cipherTextLength` (4 bytes uint32BE): Tamanho do payload criptografado.
* `chunkIv` (12 bytes): Vetor de inicialização exclusivo do bloco gerado por CSPRNG.
* `authTag` (16 bytes): Tag de autenticação AES-GCM calculada sobre o texto cifrado e AAD.
* `cipherText` (`cipherTextLength` bytes): Dados cifrados do bloco.
