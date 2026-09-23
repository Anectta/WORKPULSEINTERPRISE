# Arquitetura do Backup Engine — WorkPulse Data Plane

## 1. Visão Geral

O **Backup Engine** é o motor de alta performance que executa todas as operações de processamento intensivo de I/O, compressão, criptografia e transferência de dados diretamente no Data Plane.

> ⚠️ **REGRA ARQUITETURAL INVIOLÁVEL**: O Backup Engine é 100% autônomo e opera localmente na máquina gerenciada. Ele **NUNCA** é executado em Vercel, no navegador ou em Supabase Edge Functions.

---

## 2. Pipeline de Processamento (Streaming Pipeline)

```text
[Filesystem Source]
        ↓
[Path Normalizer & Exclusions Filter]
        ↓
[Scanner & Content Hasher (SHA-256)]
        ↓
[Stream Compressor (Zstandard / Deflate)]
        ↓
[AEAD Block Encryptor (AES-256-GCM + Argon2id)]
        ↓
[Atomic Storage Provider (Local / SMB / SFTP / S3)]
```

---

## 3. Principais Capacidades Técnicas

1. **Tipos de Job Suportados**:
   - `FULL`: Cópia completa com geração de baseline e manifesto.
   - `INCREMENTAL`: Apenas arquivos novos ou modificados desde o último backup.
   - `DIFFERENTIAL`: Arquivos alterados em relação ao último Full.
   - `MIRROR`: Espelhamento unidirecional com proteção contra exclusão massiva (*Safe Delete*).
   - `TWO_WAY_SYNC`: Sincronização bidirecional com detecção de conflitos e resolução configurável.

2. **Criptografia Autenticada (AEAD)**:
   - Cifra de bloco **AES-256-GCM**.
   - Nonce/IV único gerado por bloco via CSPRNG de 12 bytes.
   - Tags de autenticação de 16 bytes verificadas antes de entregar qualquer byte descriptografado.
   - Derivação de chave reforçada via **Argon2id** ou **PBKDF2** (100.000 iterações com salt único de 32 bytes).
   - Sobrescrita de chave na memória RAM (*Zeroization*) após o término da operação.

3. **Compressão**:
   - **Zstandard (ZSTD)**: Alta taxa de compressão com mínima sobrecarga de CPU.
   - **ZIP / Deflate**: Suporte legado universal.

4. **Retenção e Políticas GFS**:
   - Políticas avô-pai-filho (Diário, Semanal, Mensal, Anual).
   - Bloqueio de retenção concorrente (*Restore Retention Lease*): previne que snapshots referenciados por cadeias ativas ou restores em andamento sejam purgados.
