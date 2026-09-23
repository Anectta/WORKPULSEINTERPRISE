# Documentação de Criptografia — WorkPulse Backup Engine

## 1. Visão Geral

A camada de criptografia provê confidencialidade incondicional, autenticidade e integridade criptográfica contra adulterações, operando no modelo AEAD (*Authenticated Encryption with Associated Data*).

## 2. Algoritmo Criptográfico

* **Cifra:** AES-256-GCM (Galois/Counter Mode).
* **Tamanho de Chave:** 256 bits (32 bytes).
* **Autenticação:** Tag de autenticação GMAC de 128 bits (16 bytes) por bloco processado.
* **Nonce / IV:** 96 bits (12 bytes) gerados via CSPRNG (`node:crypto.randomBytes`).
* **Segurança do Nonce:** NUNCA ocorre repetição de nonce para a mesma chave. Cada bloco do arquivo recebe um IV único e aleatório, complementado pelo índice sequencial do bloco injetado no AAD (*Additional Authenticated Data*).

## 3. Streaming Criptográfico por Chunks

Para suportar arquivos de qualquer dimensão (megabytes, gigabytes, terabytes) com consumo constante de memória RAM:

1. O fluxo de dados é fatiado em blocos (`chunkSizeBytes`, padrão de 64 KB).
2. Cada bloco é cifrado individualmente com sua própria Tag de 16 bytes e seu próprio IV de 12 bytes.
3. O AAD (*Additional Authenticated Data*) de cada bloco recebe:
   - `chunkIndex` (uint32BE): Garante que nenhum bloco possa ser reordenado, duplicado ou omitido.
   - `isLastChunk` (uint8): Garante que qualquer tentativa de truncamento do arquivo seja detectada imediatamente na restauração.
4. Qualquer alteração em um único bit do texto cifrado, no IV ou na Tag causa uma exceção imediata `CRYPTO_TAMPERED_CHUNK` com abortamento da restauração.

## 4. Abstração e Desacoplamento

Toda a criptografia é governada pela interface:

```typescript
export interface EncryptionProvider {
  readonly algorithm: EncryptionAlgorithm;
  encryptStream(input: Readable, dek: Buffer, ...): Promise<EncryptedStreamHandle>;
  decryptStream(input: Readable, dek: Buffer, ...): Promise<{ stream: Readable; header: EncryptedContainerHeader }>;
}
```

Nenhum provedor de armazenamento (`LocalStorageProvider`, `SmbStorageProvider`, `SftpStorageProvider`, `S3StorageProvider`) tem acesso à senha ou chave de criptografia. Os provedores tratam os dados como um fluxo opaco e protegido de bytes.
