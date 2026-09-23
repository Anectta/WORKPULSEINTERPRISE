# Fluxo de Restauração — WorkPulse Backup Engine

## 1. Pipeline de Restauração Seguro

A restauração segue estritamente a ordem inversa do pipeline de proteção:

```text
StorageProvider
      │
      ▼ (Leitura por Stream)
Validação do Magic Bytes ("WPBK") e Versão
      │
      ▼ (Validação de Header Tag HMAC)
Extração de Parâmetros KDF e Salt
      │
      ▼ (Derivação da KEK a partir da Senha)
Desenrolamento da DEK (Unwrap via AES-256-GCM)
      │
      ▼ (Descriptografia Streaming por Chunks com Validação AEAD)
Stream Descriptografado
      │
      ▼ (Descompressão Streaming via ZSTD / ZIP)
Stream de Dados em Texto Plano
      │
      ▼ (Cálculo do Hash SHA-256 do arquivo restaurado)
Verificação contra `originalSha256`
      │
      ▼ (Gravação atômica no destino)
Restauração Concluída com Sucesso
```

## 2. Política "Fail-Safe" de Não-Entrega

Se qualquer etapa apresentar anomalia:
* Senha incorreta: Rejeição imediata no unwrap da DEK com código `CRYPTO_AUTH_FAILED`.
* Bit alterado no texto cifrado: Rejeição no chunk afetado com código `CRYPTO_TAMPERED_CHUNK`.
* Chunks fora de ordem ou faltando: Rejeição com `CRYPTO_CHUNK_OUT_OF_ORDER`.
* Truncamento: Rejeição com `CRYPTO_TRUNCATED_STREAM`.
* Checksum divergente no final: Rejeição com `INTEGRITY_CHECKSUM_MISMATCH`.

Em **NENHUMA** hipótese dados corrompidos ou incompletos são entregues silenciosamente ao usuário final. O arquivo temporário da restauração é destruído imediatamente.
