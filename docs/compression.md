# Documentação de Compressão — WorkPulse Backup Engine

## 1. Visão Geral

O módulo de compressão do WorkPulse Backup Engine é responsável por reduzir a pegada de armazenamento e a largura de banda de rede utilizada durante as rotinas de backup, operando de maneira desacoplada e antes da camada criptográfica.

## 2. Princípio da Ordem Operacional (Compression-Before-Encryption)

O fluxo segue estritamente a ordem:

```text
DADOS ORIGINAIS → COMPRESSÃO → CRIPTOGRAFIA → ARMAZENAMENTO
```

**Justificativa Técnica:**
Dados criptografados com cifras modernas como o AES-256-GCM apresentam entropia máxima e são estatisticamente indistinguíveis de ruído verdadeiramente aleatório. A aplicação de algoritmos de compressão sobre dados cifrados resulta em taxa de compressão nula (ou até acréscimo de tamanho devido a metadados de cabeçalho). Comprimir antes de criptografar garante eficiência máxima e reduz o volume de texto cifrado a ser processado.

## 3. Algoritmos Suportados

### 3.1 Zstandard (ZSTD) — Algoritmo Padrão Recomendado
* **Motor:** Zstandard C Engine compilado via WebAssembly (`@bokuweb/zstd-wasm`), baseado nas especificações da RFC 8878.
* **Níveis de Compressão:** Configuráveis de 1 (máxima velocidade) a 22 (máxima taxa). O padrão recomendado é o **Nível 3**, que oferece o ponto ideal de equilíbrio entre velocidade de throughput e redução volumétrica em ambientes corporativos.
* **Streaming por Blocos com Backpressure:** O fluxo de entrada é processado em blocos (`chunkSize` padrão de 64 KB a 256 KB) através de `node:stream.Transform`.
* **Bounded Memory:** A memória RAM é estritamente limitada ao tamanho do chunk atual, permitindo a compressão de arquivos de gigabytes e terabytes sem esgotamento de memória.

### 3.2 ZIP / DEFLATE — Algoritmo de Compatibilidade
* **Motor:** `node:zlib` nativo do Node.js (bindings de alto desempenho).
* **Níveis de Compressão:** Configuráveis de 1 a 9 (padrão: 6).
* **Casos de Uso:** Compatibilidade com ambientes legados e ferramentas padrão de arquivamento.

### 3.3 NONE — Pass-Through
* Utilizado quando o usuário desativa explicitamente a compressão ou quando o arquivo de origem já se encontra em formato altamente comprimido (ex: `.mp4`, `.zip`, `.gz`, `.jpg`).

## 4. Abstrações e Contratos

A compressão é exposta exclusivamente através do contrato `CompressionProvider`:

```typescript
export interface CompressionProvider {
  readonly algorithm: CompressionAlgorithm;
  compressStream(input: Readable, options?: { level?: number; cancellationToken?: CancellationToken }): Promise<CompressionStreamHandle>;
  decompressStream(input: Readable, options?: { cancellationToken?: CancellationToken }): Promise<Readable>;
  compressBuffer(data: Buffer, options?: { level?: number }): Promise<Buffer>;
  decompressBuffer(data: Buffer): Promise<Buffer>;
}
```

A fábrica `CompressionProviderFactory.getProvider(config)` instancia o provedor correto sem que o restante do engine conheça os detalhes internos de implementação.
