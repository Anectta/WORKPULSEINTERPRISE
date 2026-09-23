# Integridade e Cadeia de Hashing — WorkPulse Backup Engine

## 1. Separação de Camadas de Hashing

O WorkPulse Backup Engine trata cada estágio do ciclo de vida dos dados com métricas e hashes independentes:

```text
[Arquivo Original]  ──>  Hash Original (SHA-256)
         │
         ▼ (Compressão ZSTD)
[Dados Comprimidos] ──>  Hash Comprimido (SHA-256)
         │
         ▼ (Criptografia AES-256-GCM)
[Chunks Cifrados]   ──>  Auth Tag (GCM 16 bytes por chunk)
         │
         ▼ (Gravação no Storage)
[Objeto Armazenado] ──>  Hash Protegido / Storage Checksum (SHA-256 / ETag)
```

### Por que não usar apenas um hash?
1. O **Hash Original** valida a integridade lógica final dos arquivos restaurados na máquina do cliente, garantindo correspondência byte-a-byte com a fonte.
2. O **Hash Comprimido** permite diagnosticar se eventuais inconsistências ocorreram na etapa de compressão ou na camada de transporte/criptografia.
3. A **Authentication Tag (AEAD)** garante autenticidade em tempo real durante a descriptografia do stream, descartando blocos modificados antes que alcancem o descompressor.
4. O **Hash Protegido** valida a consistência de transporte físico contra o storage (`LocalStorage`, `SMB`, `SFTP`, `S3`).

## 2. Prevenção de Ataques de Temporização (Timing Attacks)

Todas as comparações de hashes e tags criptográficas utilizam a primitiva `crypto.timingSafeEqual`, garantindo que o tempo de execução da comparação seja idêntico independentemente da quantidade de bytes coincidentes, eliminando vulnerabilidades de canal lateral (*side-channel attacks*).
