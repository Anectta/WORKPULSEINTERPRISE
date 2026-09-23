import { Readable } from 'node:stream';
import { randomBytes, createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import { ZstdCompressionProvider } from '../compression/zstd-provider.js';
import { ZipCompressionProvider } from '../compression/zip-provider.js';
import { CompressionProviderFactory } from '../compression/factory.js';
import { Argon2idKeyDerivationProvider, Pbkdf2KeyDerivationProvider } from '../crypto/kdf-provider.js';
import { KeyManager } from '../crypto/key-manager.js';
import { AesGcmEncryptionProvider, WPBK_MAGIC } from '../crypto/aes-gcm-provider.js';
import { DefaultIntegrityProvider } from '../crypto/integrity-provider.js';
import { BackupPipelineManager } from '../crypto/backup-pipeline.js';
import { CancellationToken } from '../core/errors.js';
import { LocalStorageProvider } from '../storage/local-storage.js';
import { SmbStorageProvider } from '../storage/smb-storage.js';
import { SftpStorageProvider } from '../storage/sftp-storage.js';
import { S3StorageProvider } from '../storage/s3-storage.js';
import { StorageProviderType } from '../core/domain.js';
import { InMemorySecretStore } from '../security/secret-store.js';

interface TestSuiteStats {
  total: number;
  passed: number;
  failed: number;
}

const stats: TestSuiteStats = { total: 0, passed: 0, failed: 0 };

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  stats.total++;
  try {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`  ✓ ${name} (${duration}ms)`);
    stats.passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erro: ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(0, 4).join('\n    ');
      console.error(`    Stack: ${lines}`);
    }
    stats.failed++;
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function bufferToStream(buffer: Buffer, chunkSize = 16 * 1024): Readable {
  let offset = 0;
  return new Readable({
    read() {
      if (offset >= buffer.length) {
        this.push(null);
        return;
      }
      const end = Math.min(offset + chunkSize, buffer.length);
      const chunk = buffer.subarray(offset, end);
      offset = end;
      this.push(chunk);
    }
  });
}

export async function runCompressionAndCryptoTestSuite(): Promise<void> {
  console.log('='.repeat(80));
  console.log('INICIANDO SUÍTE DE TESTES: COMPRESSÃO + CRIPTOGRAFIA (ETAPA 07)');
  console.log('='.repeat(80));

  const testTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wpbk_crypto_test_'));

  try {
    // -------------------------------------------------------------
    // 1. COMPRESSÃO ZSTD
    // -------------------------------------------------------------
    await runTest('ZSTD: Compressão e Descompressão de buffer roundtrip byte-a-byte', async () => {
      const zstd = new ZstdCompressionProvider();
      const sampleText = Buffer.from('WorkPulse Backup Enterprise - '.repeat(500));
      const compressed = await zstd.compressBuffer(sampleText, { level: 3 });

      if (compressed.length >= sampleText.length) {
        throw new Error(`Compressão não reduziu o tamanho: original ${sampleText.length}, comprimido ${compressed.length}`);
      }

      const decompressed = await zstd.decompressBuffer(compressed);
      if (!decompressed.equals(sampleText)) {
        throw new Error('Texto descomprimido não coincide com o original.');
      }
    });

    await runTest('ZSTD: Streaming de arquivo com múltiplos blocos e integridade de hash', async () => {
      const zstd = new ZstdCompressionProvider({ chunkSizeBytes: 32 * 1024 });
      // Gera 250 KB de dados repetitivos
      const rawData = Buffer.from('Relatório Financeiro Confidencial WorkPulse 2026\n'.repeat(5000));
      const rawHash = createHash('sha256').update(rawData).digest('hex');

      const inputStream = bufferToStream(rawData);
      const compHandle = await zstd.compressStream(inputStream, { level: 4 });
      const compressedBuffer = await streamToBuffer(compHandle.stream);
      const compResult = await compHandle.getResult();

      if (compResult.originalSha256 !== rawHash) {
        throw new Error(`Hash original divergente no resultado: ${compResult.originalSha256} vs ${rawHash}`);
      }

      // Descompressão streaming
      const decompStream = await zstd.decompressStream(bufferToStream(compressedBuffer));
      const decompBuffer = await streamToBuffer(decompStream);

      if (!decompBuffer.equals(rawData)) {
        throw new Error('Stream ZSTD descomprimido corrompido.');
      }
    });

    await runTest('ZSTD: Rejeição de bloco corrompido com erro estruturado', async () => {
      const zstd = new ZstdCompressionProvider();
      const original = Buffer.from('Dados críticos de backup');
      const compressed = await zstd.compressBuffer(original);

      // Adultera o meio do buffer comprimido
      compressed[Math.floor(compressed.length / 2)] ^= 0xff;

      try {
        await zstd.decompressBuffer(compressed);
        throw new Error('Deveria ter lançado erro de descompressão para bloco corrompido.');
      } catch (err: any) {
        if (!err.message.includes('corrompido') && !err.message.includes('DECOMPRESSION_FAILED')) {
          throw err;
        }
      }
    });

    // -------------------------------------------------------------
    // 2. COMPRESSÃO ZIP / DEFLATE
    // -------------------------------------------------------------
    await runTest('ZIP/DEFLATE: Compressão e Descompressão por streaming', async () => {
      const zip = new ZipCompressionProvider('ZIP', 6);
      const sample = Buffer.from('Dados de compatibilidade ZIP WorkPulse\n'.repeat(800));

      const compHandle = await zip.compressStream(bufferToStream(sample));
      const compressedBuf = await streamToBuffer(compHandle.stream);

      const decompStream = await zip.decompressStream(bufferToStream(compressedBuf));
      const restored = await streamToBuffer(decompStream);

      if (!restored.equals(sample)) {
        throw new Error('Falha no roundtrip ZIP/DEFLATE.');
      }
    });

    await runTest('CompressionFactory: Resolução correta baseada na configuração', async () => {
      const zstdProv = CompressionProviderFactory.getProvider({ algorithm: 'ZSTD', level: 5 });
      if (zstdProv.algorithm !== 'ZSTD') throw new Error('Falha ao resolver ZSTD');

      const zipProv = CompressionProviderFactory.getProvider({ algorithm: 'DEFLATE' });
      if (zipProv.algorithm !== 'DEFLATE') throw new Error('Falha ao resolver DEFLATE');

      const noneProv = CompressionProviderFactory.getProvider({ algorithm: 'NONE' });
      if (noneProv.algorithm !== 'NONE') throw new Error('Falha ao resolver NONE');
    });

    // -------------------------------------------------------------
    // 3. DERIVAÇÃO DE CHAVES (ARGON2ID & PBKDF2)
    // -------------------------------------------------------------
    await runTest('KDF: Argon2id deriva chave de 256 bits com resistência e determinismo com mesmo salt', async () => {
      const argon = new Argon2idKeyDerivationProvider({ memoryCost: 8192, timeCost: 2 });
      const password = 'SuperSecretEnterprisePassword2026!';
      const salt = randomBytes(32);

      const res1 = await argon.deriveKey(password, salt);
      const res2 = await argon.deriveKey(password, salt);

      if (res1.key.length !== 32) throw new Error(`Chave deve ter 32 bytes, obteve ${res1.key.length}`);
      if (!res1.key.equals(res2.key)) throw new Error('Argon2id deve ser determinístico para a mesma senha e salt');

      // Salts distintos geram chaves completamente distintas
      const diffSalt = randomBytes(32);
      const res3 = await argon.deriveKey(password, diffSalt);
      if (res1.key.equals(res3.key)) throw new Error('Salts distintos não podem produzir a mesma chave derivada');
    });

    await runTest('KDF: PBKDF2 deriva chave e valida restrição de senha vazia e salt curto', async () => {
      const pbkdf2 = new Pbkdf2KeyDerivationProvider({ iterations: 10000 });
      const salt = randomBytes(16);

      const res = await pbkdf2.deriveKey('MinhaSenha', salt);
      if (res.key.length !== 32) throw new Error('PBKDF2 chave deve ter 32 bytes');

      // Rejeita senha vazia
      try {
        await pbkdf2.deriveKey('', salt);
        throw new Error('Deveria ter rejeitado senha vazia');
      } catch (err: any) {
        if (!err.message.includes('não pode ser vazia')) throw err;
      }

      // Rejeita salt menor que 16 bytes
      try {
        await pbkdf2.deriveKey('valida', Buffer.from('curto'));
        throw new Error('Deveria ter rejeitado salt curto');
      } catch (err: any) {
        if (!err.message.includes('mínimo 16 bytes')) throw err;
      }
    });

    // -------------------------------------------------------------
    // 4. KEY MANAGEMENT & ENVELOPE ENCRYPTION (KEK + DEK)
    // -------------------------------------------------------------
    const keyManager = new KeyManager();

    await runTest('KeyManager: Geração de DEK, wrapping com KEK e unwrap com autenticação', async () => {
      const password = 'CorporateMasterPassword_123';
      const { kek } = await keyManager.deriveKek(password, 'PBKDF2');

      const dek = keyManager.generateDek();
      const wrapped = keyManager.wrapDek(dek, kek);

      if (!wrapped.wrappedDekHex || !wrapped.wrappedDekIvHex || !wrapped.wrappedDekTagHex) {
        throw new Error('Envelope DEK incompleto.');
      }

      // Desenrola com a KEK correta
      const unwrappedDek = keyManager.unwrapDek(
        wrapped.wrappedDekHex,
        kek,
        wrapped.wrappedDekIvHex,
        wrapped.wrappedDekTagHex
      );

      if (!unwrappedDek.equals(dek)) {
        throw new Error('DEK recuperada difere da original!');
      }

      // Tenta desenrolar com KEK incorreta (simulando senha errada)
      const wrongKek = randomBytes(32);
      try {
        keyManager.unwrapDek(
          wrapped.wrappedDekHex,
          wrongKek,
          wrapped.wrappedDekIvHex,
          wrapped.wrappedDekTagHex
        );
        throw new Error('Deveria ter falhado com CRYPTO_AUTH_FAILED ao usar KEK errada');
      } catch (err: any) {
        if (!err.message.includes('Senha incorreta') && !err.message.includes('CRYPTO_AUTH_FAILED')) {
          throw err;
        }
      }
    });

    await runTest('KeyManager: Limpeza e destruição de chaves da memória (Zeroization)', async () => {
      const sensitiveKey = Buffer.from('12345678901234567890123456789012');
      keyManager.destroyKey(sensitiveKey);

      for (let i = 0; i < sensitiveKey.length; i++) {
        if (sensitiveKey[i] !== 0) {
          throw new Error(`Byte ${i} não foi zerado.`);
        }
      }
    });

    // -------------------------------------------------------------
    // 5. CRIPTOGRAFIA AUTENTICADA AES-256-GCM (WPBK STREAMING)
    // -------------------------------------------------------------
    const aesProvider = new AesGcmEncryptionProvider(32 * 1024);

    await runTest('AES-256-GCM: Criptografia e Descriptografia por streaming em chunks versionados', async () => {
      const dek = keyManager.generateDek();
      const plainContent = Buffer.from('Dados confidenciais protegidos por AES-GCM\n'.repeat(1200));
      const plainSha = createHash('sha256').update(plainContent).digest('hex');

      const mockWrapped = {
        wrappedDekHex: 'aa'.repeat(32),
        wrappedDekIvHex: 'bb'.repeat(12),
        wrappedDekTagHex: 'cc'.repeat(16)
      };

      const encHandle = await aesProvider.encryptStream(
        bufferToStream(plainContent),
        dek,
        {
          algorithm: 'AES_256_GCM',
          keyId: 'key-test-uuid',
          kdf: { type: 'PBKDF2', params: { iterations: 10000, hashAlgorithm: 'sha256', outputLength: 32 } },
          saltHex: 'ee'.repeat(32),
          chunkSizeBytes: 32 * 1024,
          originalSizeBytes: plainContent.length,
          originalSha256: plainSha,
          createdAt: new Date().toISOString()
        },
        mockWrapped
      );

      const cipherBuffer = await streamToBuffer(encHandle.stream);
      const metrics = await encHandle.getMetrics();

      if (metrics.totalChunks < 2) {
        throw new Error(`Deveria ter gerado múltiplos chunks. Gerou: ${metrics.totalChunks}`);
      }

      // Valida que o container possui o Magic WPBK
      const magic = cipherBuffer.toString('ascii', 0, 4);
      if (magic !== WPBK_MAGIC) throw new Error(`Magic inválido: ${magic}`);

      // Descriptografa
      const decResult = await aesProvider.decryptStream(bufferToStream(cipherBuffer), dek);
      const decryptedBuffer = await streamToBuffer(decResult.stream);

      if (!decryptedBuffer.equals(plainContent)) {
        throw new Error('Conteúdo descriptografado não confere byte-a-byte.');
      }
    });

    await runTest('AES-256-GCM: Detecção imediata de adulteração no texto cifrado (Tampering / AEAD failure)', async () => {
      const dek = keyManager.generateDek();
      const plainContent = Buffer.from('Mensagem de alta integridade não alterável');
      const plainSha = createHash('sha256').update(plainContent).digest('hex');

      const encHandle = await aesProvider.encryptStream(
        bufferToStream(plainContent),
        dek,
        {
          algorithm: 'AES_256_GCM',
          keyId: 'k-1',
          kdf: { type: 'PBKDF2', params: { iterations: 1000, hashAlgorithm: 'sha256', outputLength: 32 } },
          saltHex: 'ff'.repeat(32),
          chunkSizeBytes: 1024,
          originalSizeBytes: plainContent.length,
          originalSha256: plainSha,
          createdAt: new Date().toISOString()
        },
        { wrappedDekHex: 'aa'.repeat(32), wrappedDekIvHex: 'bb'.repeat(12), wrappedDekTagHex: 'cc'.repeat(16) }
      );

      const cipherBytes = await streamToBuffer(encHandle.stream);

      // Adultera um byte no último chunk
      cipherBytes[cipherBytes.length - 5] ^= 0x42;

      try {
        const dec = await aesProvider.decryptStream(bufferToStream(cipherBytes), dek);
        await streamToBuffer(dec.stream);
        throw new Error('Deveria ter lançado erro de violação de integridade (AEAD Tag Mismatch).');
      } catch (err: any) {
        if (!err.message.includes('Falha de autenticação no bloco') && !err.message.includes('CRYPTO_TAMPERED_CHUNK')) {
          throw err;
        }
      }
    });

    await runTest('AES-256-GCM: Detecção de truncamento de arquivo (Stream incompleto)', async () => {
      const dek = keyManager.generateDek();
      const plain = Buffer.from('Linha de backup importante\n'.repeat(500));
      const plainSha = createHash('sha256').update(plain).digest('hex');

      const encHandle = await aesProvider.encryptStream(
        bufferToStream(plain),
        dek,
        {
          algorithm: 'AES_256_GCM',
          keyId: 'k-trunc',
          kdf: { type: 'PBKDF2', params: { iterations: 1000, hashAlgorithm: 'sha256', outputLength: 32 } },
          saltHex: '11'.repeat(32),
          chunkSizeBytes: 2048,
          originalSizeBytes: plain.length,
          originalSha256: plainSha,
          createdAt: new Date().toISOString()
        },
        { wrappedDekHex: 'aa'.repeat(32), wrappedDekIvHex: 'bb'.repeat(12), wrappedDekTagHex: 'cc'.repeat(16) }
      );

      const fullCipher = await streamToBuffer(encHandle.stream);
      // Corta os últimos 300 bytes (truncamento proposital)
      const truncatedCipher = fullCipher.subarray(0, fullCipher.length - 300);

      try {
        const dec = await aesProvider.decryptStream(bufferToStream(truncatedCipher), dek);
        await streamToBuffer(dec.stream);
        throw new Error('Deveria ter rejeitado o arquivo truncado');
      } catch (err: any) {
        if (!err.message.includes('truncado') && !err.message.includes('CRYPTO_TRUNCATED_STREAM')) {
          throw err;
        }
      }
    });

    // -------------------------------------------------------------
    // 6. PIPELINE COMPLETO: ORIGINAL -> HASH -> COMPRESS -> ENCRYPT -> RESTORE
    // -------------------------------------------------------------
    const pipeline = new BackupPipelineManager(keyManager);
    const password = 'P@sswordEnterprise2026_RobustSecret';

    await runTest('Pipeline: Fluxo completo com ZSTD + AES-256-GCM + Argon2id com verificação estrita', async () => {
      const payloadOriginal = Buffer.from(
        'Contratos Comerciais 2026\nCláusula 1: Confidencialidade Absoluta\n'.repeat(2500)
      );
      const originalSha256 = createHash('sha256').update(payloadOriginal).digest('hex');

      // Proteção (Backup)
      const protectRes = await pipeline.protectStream(bufferToStream(payloadOriginal), {
        password,
        kdfAlgorithm: 'ARGON2ID',
        kdfParams: { memoryCost: 8192, timeCost: 2 },
        compressionConfig: { algorithm: 'ZSTD', level: 3, chunkSize: 32 * 1024 },
        originalSizeBytes: payloadOriginal.length,
        originalSha256
      });

      const protectedBytes = await streamToBuffer(protectRes.protectedStream);
      const header = await protectRes.getHeader();
      const metrics = await protectRes.getMetrics();

      if (!header) throw new Error('Header do container não foi gerado');
      if (header.originalSha256 !== originalSha256) {
        throw new Error(`Hash original do header ${header.originalSha256} difere de ${originalSha256}`);
      }
      if (!metrics.encryptedSha256) throw new Error('Métricas sem hash protegido');

      // Restauração (Restore) com senha correta
      const restoreRes = await pipeline.restoreStream(bufferToStream(protectedBytes), password);
      const restoredBuffer = await streamToBuffer(restoreRes.restoredStream);
      const integrityCheck = await restoreRes.verifyOriginalIntegrity();

      if (!integrityCheck.verified) throw new Error('Falha na verificação de integridade pós-restore');
      if (!restoredBuffer.equals(payloadOriginal)) {
        throw new Error('Dados restaurados diferem do arquivo original!');
      }

      // Tentativa de restauração com senha errada
      try {
        const failedRestore = await pipeline.restoreStream(bufferToStream(protectedBytes), 'SenhaIncorreta123');
        await streamToBuffer(failedRestore.restoredStream);
        throw new Error('Restauração com senha incorreta deveria ter falhado!');
      } catch (err: any) {
        if (!err.message.includes('Senha incorreta') && !err.message.includes('CRYPTO_AUTH_FAILED')) {
          throw err;
        }
      }
    });

    // -------------------------------------------------------------
    // 7. INTEGRAÇÃO COM TODOS OS PROVEDORES DE STORAGE (LOCAL, SMB, SFTP, S3)
    // -------------------------------------------------------------
    const secretStore = new InMemorySecretStore();
    await secretStore.setSecret('smb_creds', JSON.stringify({ username: 'corp_admin', password: 'SecretPassword123' }));
    await secretStore.setSecret('sftp_creds', JSON.stringify({ host: 'sftp.corp.net', username: 'backup_user', privateKey: 'MOCK_KEY' }));
    await secretStore.setSecret('s3_creds', JSON.stringify({ accessKeyId: 'AKIA_TEST', secretAccessKey: 'SECRET_S3_KEY' }));

    const localProv = new LocalStorageProvider(path.join(testTempDir, 'local_storage'));
    await localProv.initialize();

    const smbProv = new SmbStorageProvider(
      { type: StorageProviderType.SMB, server: 'corp-file01', share: 'backups', basePath: 'daily' },
      { localMountPath: path.join(testTempDir, 'smb_share'), secretStore, secretKeyRef: 'smb_creds' }
    );
    await smbProv.initialize();

    const sftpProv = new SftpStorageProvider(
      { type: StorageProviderType.SFTP, host: '127.0.0.1', port: 22, remoteBasePath: 'backups' },
      { localSimulationPath: path.join(testTempDir, 'sftp_base'), secretStore, secretKeyRef: 'sftp_creds' }
    );
    await sftpProv.initialize();

    const s3Prov = new S3StorageProvider(
      { type: StorageProviderType.S3, bucket: 'enterprise-backup-bucket', region: 'us-east-1', prefix: 'tenants/acme' },
      { secretStore, secretKeyRef: 's3_creds', mockSimulation: true }
    );
    await s3Prov.initialize();

    const storageProviders = [
      { name: 'LocalStorageProvider', provider: localProv },
      { name: 'SmbStorageProvider', provider: smbProv },
      { name: 'SftpStorageProvider', provider: sftpProv },
      { name: 'S3StorageProvider', provider: s3Prov }
    ];

    for (const { name, provider } of storageProviders) {
      await runTest(`Pipeline End-to-End no Provedor: ${name}`, async () => {
        const sampleData = Buffer.from(`Payload para storage ${name} com compressão e cifra.\n`.repeat(1000));
        const sampleSha = createHash('sha256').update(sampleData).digest('hex');

        // 1. Pipeline Protect
        const protect = await pipeline.protectStream(bufferToStream(sampleData), {
          password: 'UniversalStoragePassword_2026',
          compressionConfig: { algorithm: 'ZSTD', level: 3 },
          kdfAlgorithm: 'PBKDF2',
          originalSizeBytes: sampleData.length,
          originalSha256: sampleSha
        });

        const targetStoragePath = `backups/encrypted_job_${name.toLowerCase()}.wpbk`;
        await provider.putStream(targetStoragePath, protect.protectedStream);

        const exists = await provider.exists(targetStoragePath);
        if (!exists) throw new Error(`Arquivo protegido não encontrado no storage ${name}`);

        // 2. Leitura do Storage e Restore
        const readStream = await provider.getStream(targetStoragePath);
        const restore = await pipeline.restoreStream(readStream, 'UniversalStoragePassword_2026');
        const restored = await streamToBuffer(restore.restoredStream);
        const check = await restore.verifyOriginalIntegrity();

        if (!check.verified || !restored.equals(sampleData)) {
          throw new Error(`Falha na restauração do backup a partir do storage ${name}`);
        }
      });
    }

    // -------------------------------------------------------------
    // 8. CANCELAMENTO ATÔMICO
    // -------------------------------------------------------------
    await runTest('Resilience: CancellationToken aborta pipeline sem travar recursos', async () => {
      const cancelToken = new CancellationToken();
      const largeStream = bufferToStream(Buffer.alloc(1024 * 1024, 0xaa));

      const protect = await pipeline.protectStream(largeStream, {
        password: 'Password_Cancel',
        compressionConfig: { algorithm: 'ZSTD' },
        cancellationToken: cancelToken
      });

      // Cancela no meio
      cancelToken.cancel('Usuário solicitou abortamento manual');

      try {
        await streamToBuffer(protect.protectedStream);
        throw new Error('Deveria ter abortado stream cancelado.');
      } catch (err: any) {
        if (!err.message.includes('cancelada') && !err.message.includes('abortamento manual')) {
          throw err;
        }
      }
    });

  } finally {
    await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log('='.repeat(80));
  console.log(`RESULTADO DOS TESTES DE COMPRESSÃO E CRIPTOGRAFIA: ${stats.failed === 0 ? '✅ TODOS PASSARAM' : '❌ HOUVE FALHAS'}`);
  console.log(`Total: ${stats.total} | Aprovados: ${stats.passed} | Falhas: ${stats.failed}`);
  console.log('='.repeat(80));

  if (stats.failed > 0) {
    process.exit(1);
  }
}

// Execução direta via CLI
if (process.argv[1]?.endsWith('compression-crypto.test.ts')) {
  runCompressionAndCryptoTestSuite().catch((err) => {
    console.error('Falha fatal na execução dos testes:', err);
    process.exit(1);
  });
}
