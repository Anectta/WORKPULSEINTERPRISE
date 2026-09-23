import { Readable } from 'node:stream';
import { createHash, timingSafeEqual } from 'node:crypto';
import { EncryptedContainerHeader, IntegrityProvider } from './contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

/**
 * Provedor de Integridade e Validação de Checksums
 * Mantém distinção explícita entre Hash Original, Hash Comprimido e Hash Protegido
 */
export class DefaultIntegrityProvider implements IntegrityProvider {
  public async calculateSha256(streamOrBuffer: Readable | Buffer): Promise<string> {
    if (Buffer.isBuffer(streamOrBuffer)) {
      return createHash('sha256').update(streamOrBuffer).digest('hex');
    }

    return new Promise<string>((resolve, reject) => {
      const hasher = createHash('sha256');
      streamOrBuffer.on('data', (chunk: Buffer) => hasher.update(chunk));
      streamOrBuffer.on('end', () => resolve(hasher.digest('hex')));
      streamOrBuffer.on('error', (err) => reject(err));
    });
  }

  /**
   * Comparação em tempo constante para evitar ataques de temporização (Timing Attacks)
   */
  public verifySha256(expectedSha256: string, actualSha256: string): boolean {
    if (!expectedSha256 || !actualSha256) return false;
    if (expectedSha256.length !== actualSha256.length) return false;

    try {
      const bufA = Buffer.from(expectedSha256, 'hex');
      const bufB = Buffer.from(actualSha256, 'hex');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  public verifyContainerHeader(header: EncryptedContainerHeader): boolean {
    if (!header) return false;
    if (header.magic !== 'WPBK') return false;
    if (header.formatVersion !== 1) return false;
    if (!header.keyId || !header.saltHex) return false;
    if (!header.wrappedDekHex || !header.wrappedDekIvHex || !header.wrappedDekTagHex) return false;
    if (!header.originalSha256 || header.originalSha256.length !== 64) return false;
    return true;
  }

  public assertIntegrity(expectedSha256: string, actualSha256: string, stage: string): void {
    if (!this.verifySha256(expectedSha256, actualSha256)) {
      throw new EngineError({
        code: 'INTEGRITY_CHECKSUM_MISMATCH',
        message: `Falha crítica de integridade na etapa [${stage}]: Hash esperado "${expectedSha256}", hash obtido "${actualSha256}".`,
        category: ErrorCategory.CORRUPTION
      });
    }
  }
}
