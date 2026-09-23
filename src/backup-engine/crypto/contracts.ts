import { Readable } from 'node:stream';
import { CancellationToken } from '../core/errors.js';
import { CompressionAlgorithm } from '../compression/contracts.js';

export type EncryptionAlgorithm = 'AES_256_GCM' | 'NONE';
export type KdfAlgorithm = 'ARGON2ID' | 'PBKDF2';

export interface Argon2idParams {
  memoryCost: number; // Ex: 65536 KB (64MB) para produção, configurável
  timeCost: number;   // Ex: 3 iterações
  parallelism: number; // Ex: 1 a 4 threads
  outputLength: number; // 32 bytes para AES-256
}

export interface Pbkdf2Params {
  iterations: number; // Ex: 100000
  hashAlgorithm: 'sha256' | 'sha512';
  outputLength: number; // 32 bytes para AES-256
}

export type KdfParameters =
  | { type: 'ARGON2ID'; params: Argon2idParams }
  | { type: 'PBKDF2'; params: Pbkdf2Params };

/**
 * Cabeçalho do arquivo ou bloco criptografado (livre de senhas ou chaves secretas)
 */
export interface EncryptedContainerHeader {
  magic: string; // 'WPBK'
  formatVersion: number; // 1
  algorithm: EncryptionAlgorithm;
  keyId: string;
  kdf: KdfParameters;
  saltHex: string; // Salt criptográfico aleatório (16 a 32 bytes)
  wrappedDekHex: string; // DEK envolvida/criptografada pela KEK
  wrappedDekIvHex: string; // IV de 12 bytes usado para envolver a DEK
  wrappedDekTagHex: string; // Tag de autenticação GCM do envelope da DEK
  chunkSizeBytes: number;
  originalSizeBytes: number;
  originalSha256: string;
  compressedSizeBytes?: number;
  compressedSha256?: string;
  compressionAlgorithm?: CompressionAlgorithm;
  compressionLevel?: number;
  createdAt: string;
}

/**
 * Metadados de integridade e hashing separados e explícitos
 */
export interface PipelineIntegrityMetrics {
  originalSha256: string;
  compressedSha256?: string;
  encryptedSha256: string;
  storageChecksum?: string;
  totalChunks: number;
  totalEncryptedSizeBytes: number;
}

/**
 * Handle retornado pelo stream de criptografia
 */
export interface EncryptedStreamHandle {
  stream: Readable;
  getHeader(): Promise<EncryptedContainerHeader>;
  getMetrics(): Promise<PipelineIntegrityMetrics>;
}

/**
 * Provedor de Derivação de Chaves (KDF)
 * Equivalente a: trait KeyDerivationProvider
 */
export interface KeyDerivationProvider {
  readonly algorithm: KdfAlgorithm;

  deriveKey(
    password: string,
    salt: Buffer,
    customParams?: Partial<Argon2idParams | Pbkdf2Params>
  ): Promise<{ key: Buffer; actualParams: KdfParameters }>;
}

/**
 * Provedor de Criptografia Autenticada (AEAD)
 * Equivalente a: trait EncryptionProvider
 */
export interface EncryptionProvider {
  readonly algorithm: EncryptionAlgorithm;

  encryptStream(
    input: Readable,
    dek: Buffer,
    headerMetadata: Omit<EncryptedContainerHeader, 'magic' | 'formatVersion' | 'wrappedDekHex' | 'wrappedDekIvHex' | 'wrappedDekTagHex'>,
    wrappedDekInfo: { wrappedDekHex: string; wrappedDekIvHex: string; wrappedDekTagHex: string },
    options?: { cancellationToken?: CancellationToken }
  ): Promise<EncryptedStreamHandle>;

  decryptStream(
    input: Readable,
    dek: Buffer,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<{ stream: Readable; header: EncryptedContainerHeader }>;
}

/**
 * Provedor de Verificação de Integridade
 * Equivalente a: trait IntegrityProvider
 */
export interface IntegrityProvider {
  calculateSha256(streamOrBuffer: Readable | Buffer): Promise<string>;
  verifySha256(expectedSha256: string, actualSha256: string): boolean;
  verifyContainerHeader(header: EncryptedContainerHeader): boolean;
}
