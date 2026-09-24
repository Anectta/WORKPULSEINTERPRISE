import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import {
  LocalStorageProvider,
  SmbStorageProvider,
  SftpStorageProvider,
  S3StorageProvider,
  StorageProviderFactory,
  StoragePathNormalizer,
  StorageConfigValidator,
  LOCAL_STORAGE_CAPABILITIES,
  SMB_STORAGE_CAPABILITIES,
  SFTP_STORAGE_CAPABILITIES,
  S3_STORAGE_CAPABILITIES
} from '../storage/index.js';
import { StorageProviderType, BackupDestination } from '../core/domain.js';
import { InMemorySecretStore } from '../security/secret-store.js';
import { EngineError } from '../core/errors.js';

let totalTests = 0;
let passedTests = 0;

async function runTest(name: string, fn: () => Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erro: ${err?.message || err}`);
    if (err?.stack) {
      console.error(`    Stack: ${err.stack}`);
    }
  }
}

function stringToStream(text: string): Readable {
  return Readable.from(Buffer.from(text, 'utf-8'));
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function runStorageTestSuite() {
  console.log('==================================================');
  console.log('INICIANDO SUÍTE DE TESTES: STORAGE PROVIDERS (ETAPA 06)');
  console.log('==================================================');

  const testBaseDir = `/tmp/workpulse_storage_test_${Date.now()}`;
  await fsp.mkdir(testBaseDir, { recursive: true });

  const secretStore = new InMemorySecretStore();
  await secretStore.setSecret(
    'smb_creds_test',
    JSON.stringify({ username: 'backup_admin', password: 'SuperSecretSmbPassword123' })
  );
  await secretStore.setSecret(
    'sftp_creds_test',
    JSON.stringify({ username: 'sftp_operator', password: 'SuperSecretSftpKey456' })
  );
  await secretStore.setSecret(
    's3_creds_test',
    JSON.stringify({ accessKeyId: 'AKIA_PROD_SAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' })
  );

  // 1. Testes de StorageCapabilities
  await runTest('StorageCapabilities: Validação das matrizes de capacidades declaradas', async () => {
    const local = new LocalStorageProvider(path.join(testBaseDir, 'local'));
    const smb = new SmbStorageProvider({ type: StorageProviderType.SMB, server: 'nas.lan', share: 'backups' });
    const sftp = new SftpStorageProvider({ type: StorageProviderType.SFTP, host: 'sftp.corp.net' });
    const s3 = new S3StorageProvider({ type: StorageProviderType.S3, bucket: 'company-backup-vault' });

    if (!local.capabilities().supportsAtomicRename) throw new Error('Local deve suportar atomic rename');
    if (!smb.capabilities().supportsDirectories) throw new Error('SMB deve suportar diretórios');
    if (!sftp.capabilities().supportsResume) throw new Error('SFTP deve suportar resume');
    if (s3.capabilities().supportsAtomicRename) throw new Error('S3 não deve alegar suporte nativo a atomic rename');
    if (!s3.capabilities().supportsMultipartUpload) throw new Error('S3 deve suportar multipart upload');
    if (!s3.capabilities().supportsServerSideCopy) throw new Error('S3 deve suportar server-side copy');
  });

  // 2. Testes de StoragePathNormalizer & Segurança contra Traversal
  await runTest('StoragePathNormalizer: Normalização de caminhos e bloqueio contra Path Traversal', async () => {
    const norm1 = StoragePathNormalizer.normalizeRelativePath('folder1\\subfolder2/file.txt');
    if (norm1 !== 'folder1/subfolder2/file.txt') throw new Error(`Normalização incorreta: ${norm1}`);

    const joined = StoragePathNormalizer.join('archive/2026', 'manifest.json');
    if (joined !== 'archive/2026/manifest.json') throw new Error(`Join incorreto: ${joined}`);

    const s3Key = StoragePathNormalizer.toS3Key('tenant_123/backups', 'db/dump.tar.zst');
    if (s3Key !== 'tenant_123/backups/db/dump.tar.zst') throw new Error(`S3 key incorreta: ${s3Key}`);

    let blockedTraversal = false;
    try {
      StoragePathNormalizer.normalizeRelativePath('../../../etc/passwd');
    } catch (e: any) {
      if (e.code === 'SECURITY_PATH_TRAVERSAL') blockedTraversal = true;
    }
    if (!blockedTraversal) throw new Error('Deveria ter bloqueado Path Traversal com ../');
  });

  // 3. Testes do LocalStorageProvider
  await runTest('LocalStorage: Upload atômico, streaming, download com range, rename e exclusão', async () => {
    const localDir = path.join(testBaseDir, 'local_storage');
    const provider = new LocalStorageProvider(localDir);
    await provider.initialize();

    const isConnected = await provider.validateConnection();
    if (!isConnected) throw new Error('Conexão local deve ser válida');

    // PutStream
    const content = 'CONTEUDO_TESTE_LOCAL_STREAMING_ATOMICO_123456';
    let progressReported = 0;
    const writtenBytes = await provider.putStream('documents/contract.pdf', stringToStream(content), {
      onProgress: (b) => {
        progressReported = b;
      }
    });

    if (writtenBytes !== Buffer.byteLength(content)) throw new Error('Bytes gravados incorretos');
    if (progressReported !== writtenBytes) throw new Error('Progresso não foi reportado');

    // Exists & Metadata
    const exists = await provider.exists('documents/contract.pdf');
    if (!exists) throw new Error('Arquivo gravado deveria existir');

    const meta = await provider.getMetadata('documents/contract.pdf');
    if (!meta || meta.sizeBytes !== writtenBytes || meta.isDirectory) {
      throw new Error('Metadados retornados incorretos');
    }

    // GetStream com Range
    const fullStream = await provider.getStream('documents/contract.pdf');
    const readFull = await streamToString(fullStream);
    if (readFull !== content) throw new Error(`Conteúdo lido divergente: ${readFull}`);

    const rangeStream = await provider.getStream('documents/contract.pdf', { start: 0, end: 7 });
    const readRange = await streamToString(rangeStream);
    if (readRange !== 'CONTEUDO') throw new Error(`Range stream incorreto: ${readRange}`);

    // Rename
    await provider.rename('documents/contract.pdf', 'documents/archived_contract.pdf');
    const oldExists = await provider.exists('documents/contract.pdf');
    const newExists = await provider.exists('documents/archived_contract.pdf');
    if (oldExists || !newExists) throw new Error('Falha no rename local');

    // ListDirectory
    const list = await provider.listDirectory('documents');
    if (list.length !== 1 || list[0].path !== 'documents/archived_contract.pdf') {
      throw new Error('Listagem de diretório local incorreta');
    }

    // Delete
    await provider.delete('documents/archived_contract.pdf');
    const afterDelete = await provider.exists('documents/archived_contract.pdf');
    if (afterDelete) throw new Error('Arquivo deveria ter sido excluído');

    await provider.close();
  });

  // 4. Testes do SmbStorageProvider
  await runTest('SmbStorage: Suporte a compartilhamento SMB, credenciais via SecretStore, streaming e isolamento', async () => {
    const smbDir = path.join(testBaseDir, 'smb_share');
    const provider = new SmbStorageProvider(
      {
        type: StorageProviderType.SMB,
        server: 'nas-enterprise-01',
        share: 'financeiro',
        basePath: 'backups/2026'
      },
      {
        secretStore,
        secretKeyRef: 'smb_creds_test',
        localMountPath: smbDir
      }
    );

    await provider.initialize();
    const valid = await provider.validateConnection();
    if (!valid) throw new Error('Validação SMB falhou');

    const smbContent = 'DADOS_FINANCEIROS_SMB_SIGILOSOS_2026';
    await provider.putStream('relatorios/dre.xlsx', stringToStream(smbContent));

    const exists = await provider.exists('relatorios/dre.xlsx');
    if (!exists) throw new Error('Arquivo SMB deveria existir');

    const stream = await provider.getStream('relatorios/dre.xlsx');
    const text = await streamToString(stream);
    if (text !== smbContent) throw new Error('Conteúdo lido do SMB incorreto');

    // Copia no SMB
    await provider.copy('relatorios/dre.xlsx', 'relatorios/dre_backup.xlsx');
    const copyExists = await provider.exists('relatorios/dre_backup.xlsx');
    if (!copyExists) throw new Error('Cópia SMB deveria existir');

    await provider.close();
  });

  // 5. Testes do SftpStorageProvider
  await runTest('SftpStorage: Conexão SFTP, upload atômico .sftp_tmp, credenciais e listagem remota', async () => {
    const sftpDir = path.join(testBaseDir, 'sftp_remote');
    const provider = new SftpStorageProvider(
      {
        type: StorageProviderType.SFTP,
        host: 'sftp.cloudcorp.io',
        port: 2222,
        remoteBasePath: '/data/backups',
        hostKeyPolicy: 'accept_new'
      },
      {
        secretStore,
        secretKeyRef: 'sftp_creds_test',
        localSimulationPath: sftpDir
      }
    );

    await provider.initialize();
    const valid = await provider.validateConnection();
    if (!valid) throw new Error('Validação SFTP falhou');

    const sftpData = 'SFTP_PAYLOAD_DATA_TRANSACTION_RECORDS';
    await provider.putStream('transactions/tx_log.db', stringToStream(sftpData));

    const meta = await provider.getMetadata('transactions/tx_log.db');
    if (!meta || meta.sizeBytes !== Buffer.byteLength(sftpData)) {
      throw new Error('Metadados SFTP incorretos');
    }

    const readStream = await provider.getStream('transactions/tx_log.db');
    const text = await streamToString(readStream);
    if (text !== sftpData) throw new Error('Conteúdo SFTP divergente');

    await provider.close();
  });

  // 5.1 Teste de Instanciação e Capacidades do SftpStorageProvider nativo SSH2
  await runTest('SftpStorage: Instanciação Nativa SSH2 (ssh2.Client), configuração e matriz de capacidades', async () => {
    const sftpProvider = new SftpStorageProvider(
      {
        type: StorageProviderType.SFTP,
        host: 'backup-sftp.internal.corp',
        port: 22,
        remoteBasePath: '/var/storage/backups',
        hostKeyPolicy: 'strict'
      },
      {
        secretStore,
        secretKeyRef: 'sftp_creds_test'
      }
    );

    if (sftpProvider.isLocalSimulation()) {
      throw new Error('Deveria estar em modo de rede SSH2 real');
    }

    const caps = sftpProvider.capabilities();
    if (!caps.supportsDirectories || !caps.supportsAtomicRename || !caps.supportsResume) {
      throw new Error('Capabilities do SftpStorageProvider incorretas');
    }

    await sftpProvider.close();
  });

  // 6. Testes do S3StorageProvider (Multipart Upload, Metadata, Checksum e Rename Lógico)
  await runTest('S3Storage: Upload, Multipart Upload com Part ETags, Server-Side Copy + Delete e Bloqueio de Exclusão Perigosa', async () => {
    const provider = new S3StorageProvider(
      {
        type: StorageProviderType.S3,
        bucket: 'workpulse-production-cold-storage',
        region: 'us-east-1',
        prefix: 'tenants/acme_corp',
        multipartThresholdBytes: 1024 * 1024, // 1 MB threshold para teste rápido
        multipartPartSizeBytes: 512 * 1024 // 512 KB partes
      },
      {
        secretStore,
        secretKeyRef: 's3_creds_test',
        mockSimulation: true
      }
    );

    await provider.initialize();

    // 6.1 Upload de Arquivo Regular com Custom Metadata
    const regularContent = 'S3_PAYLOAD_CONFIG_JSON_DOCUMENT';
    await provider.putStream('configs/app_settings.json', stringToStream(regularContent), {
      metadata: {
        backup_job_id: 'job_uuid_999',
        execution_id: 'exec_uuid_888'
      }
    });

    const regMeta = await provider.getMetadata('configs/app_settings.json');
    if (!regMeta || regMeta.metadata?.backup_job_id !== 'job_uuid_999') {
      throw new Error('Custom metadata não persistida no objeto S3');
    }

    // 6.2 Upload de Arquivo Grande disparando Multipart Upload (2 MB)
    const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 0x5a); // 2 MB preenchidos
    const largeReadable = Readable.from(largeBuffer);
    const uploadedBytes = await provider.putStream('database/large_dump.sql', largeReadable);

    if (uploadedBytes !== 2 * 1024 * 1024) {
      throw new Error(`Tamanho gravado pelo Multipart S3 incorreto: ${uploadedBytes}`);
    }

    const largeMeta = await provider.getMetadata('database/large_dump.sql');
    if (!largeMeta || largeMeta.sizeBytes !== 2 * 1024 * 1024) {
      throw new Error('Metadados do objeto Multipart S3 incorretos');
    }

    // 6.3 S3 Logical Rename (Copy + Delete)
    await provider.rename('database/large_dump.sql', 'database/archived_dump.sql');
    const oldExists = await provider.exists('database/large_dump.sql');
    const newExists = await provider.exists('database/archived_dump.sql');
    if (oldExists || !newExists) throw new Error('Falha no rename lógico S3');

    // 6.4 Bloqueio de exclusão perigosa
    let dangerousBlocked = false;
    try {
      await provider.delete('');
    } catch (err: any) {
      if (err.code === 'S3_DANGEROUS_DELETE_BLOCKED') dangerousBlocked = true;
    }
    if (!dangerousBlocked) throw new Error('Deveria ter bloqueado exclusão com chave vazia no S3');

    await provider.close();
  });

  // 6.5 Teste do S3StorageProvider com AWS SDK Oficial (@aws-sdk/client-s3)
  await runTest('S3Storage: Instanciação Oficial AWS SDK (@aws-sdk/client-s3), endpoints customizados MinIO e ciclo de conexão', async () => {
    const realSdkProvider = new S3StorageProvider(
      {
        type: StorageProviderType.S3,
        bucket: 'workpulse-enterprise-cloud-vault',
        region: 'sa-east-1',
        endpoint: 'minio.corp.workpulse.com.br:9000',
        forcePathStyle: true,
        useSsl: true,
        prefix: 'snapshots/primary'
      },
      {
        secretStore,
        secretKeyRef: 's3_creds_test',
        mockSimulation: false // Força instanciação real do AWS S3Client
      }
    );

    if (realSdkProvider.isMockSimulation()) {
      throw new Error('Deveria estar em modo de produção real, não mock');
    }

    await realSdkProvider.initialize();

    const client = realSdkProvider.getClient();
    if (!client) {
      throw new Error('S3Client oficial da AWS SDK não foi inicializado');
    }

    // Verifica capabilities
    const caps = realSdkProvider.capabilities();
    if (!caps.supportsMultipartUpload || !caps.supportsServerSideCopy) {
      throw new Error('Capabilities do S3StorageProvider incorretas');
    }

    // Desconecta e valida cleanup do cliente
    await realSdkProvider.close();
    if (realSdkProvider.getClient() !== null) {
      throw new Error('S3Client deveria ter sido destruído após close()');
    }
  });

  // 7. Testes da Factory e Registry
  await runTest('StorageProviderFactory: Resolução correta de instâncias baseada em BackupDestination', async () => {
    const destLocal: BackupDestination = {
      id: 'dest_1',
      name: 'Local Backup',
      providerType: StorageProviderType.LOCAL,
      baseUri: path.join(testBaseDir, 'factory_local'),
      config: {}
    };

    const destS3: BackupDestination = {
      id: 'dest_2',
      name: 'S3 Backup',
      providerType: StorageProviderType.S3,
      baseUri: 'my-bucket',
      config: { region: 'eu-central-1', mockSimulation: true },
      secretKeyRef: 's3_creds_test'
    };

    const provLocal = StorageProviderFactory.createProvider(destLocal, { secretStore });
    const provS3 = StorageProviderFactory.createProvider(destS3, { secretStore });

    if (!(provLocal instanceof LocalStorageProvider)) throw new Error('Factory não criou LocalStorageProvider');
    if (!(provS3 instanceof S3StorageProvider)) throw new Error('Factory não criou S3StorageProvider');
  });

  // Limpeza
  try {
    await fsp.rm(testBaseDir, { recursive: true, force: true });
  } catch {}

  console.log('==================================================');
  console.log(`RESULTADO DOS TESTES DE STORAGE: ${passedTests === totalTests ? '✅ TODOS PASSARAM' : '❌ HOUVE FALHAS'}`);
  console.log(`Total: ${totalTests} | Aprovados: ${passedTests} | Falhas: ${totalTests - passedTests}`);
  console.log('==================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

// Executa se chamado diretamente via CLI
if (process.argv[1]?.endsWith('storage.test.ts')) {
  runStorageTestSuite().catch((err) => {
    console.error('Erro fatal na suíte de testes de storage:', err);
    process.exit(1);
  });
}
