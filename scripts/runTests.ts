import { SecurityTestSuite } from '../server/security/securityTestSuite';
import { E2EIntegrationSuite } from '../server/security/e2eIntegrationSuite';
import { runCoreEngineTests } from '../src/backup-engine/tests/core-engine.test';
import { runSchedulerQueueRetryTests } from '../src/backup-engine/tests/scheduler-queue-retry.test';
import { runStorageTestSuite } from '../src/backup-engine/tests/storage.test';
import { runCompressionAndCryptoTestSuite } from '../src/backup-engine/tests/compression-crypto.test';
import { runMirrorAndSyncTests } from '../src/backup-engine/tests/mirror-and-sync.test';
import { runRestoreRetentionTests } from '../src/backup-engine/tests/restore-retention.test';
import { runFailureResilienceTests } from '../tests/failure/failure-resilience.test';
import { runSecurityHardeningTests } from '../tests/security/security-hardening.test';
import { runE2EScenarios } from '../tests/integration/e2e-scenarios.test';
import { runPerformanceAndStressTests } from '../tests/performance/performance-stress.test';

async function main() {
  const startTime = Date.now();
  console.log('================================================================================');
  console.log('       WORKPULSE ENTERPRISE & BACKUP ENGINE — MASTER TEST RUNNER');
  console.log('          VALIDAÇÃO TOTAL: ENGINE + AGENT + SAAS + RESILIENCE (ETAPA 14)');
  console.log('================================================================================\n');

  let allPassed = true;
  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Suíte de Hardening e Pentest
  console.log('▶ [01/12] Executando Suíte de Hardening e Segurança (16 Verificações)...');
  const hardening = await SecurityTestSuite.runAllTests();
  totalChecks += hardening.totalTests;
  passedChecks += hardening.passedCount;
  if (hardening.overallStatus !== 'PASSED') allPassed = false;
  console.log(`  Resultado: ${hardening.overallStatus} (${hardening.passedCount}/${hardening.totalTests} aprovados | ${hardening.successRatePct}%)\n`);

  // 2. Suíte E2E SaaS e Auditoria Multi-Tenant
  console.log('▶ [02/12] Executando Suíte de Integração E2E SaaS & Go-Live (19 Etapas)...');
  const e2e = await E2EIntegrationSuite.runFullE2ETestSuite('tenant-demo');
  totalChecks += e2e.totalSteps;
  passedChecks += e2e.passedSteps;
  if (e2e.status !== 'SUCCESS') allPassed = false;
  console.log(`  Resultado: ${e2e.status} (${e2e.passedSteps}/${e2e.totalSteps} etapas | ${e2e.successRatePct}%)`);
  console.log(`  Isolamento Multi-Tenant: ${e2e.multiTenantAudit.testsPassed}/${e2e.multiTenantAudit.testsTotal} ataques bloqueados.`);
  console.log(`  Certificação: ${e2e.certification}\n`);

  // 3. Suíte do Backup Core Engine
  console.log('▶ [03/12] Executando Suíte do Backup Core Engine (8 Verificações)...');
  const backupTest = await runCoreEngineTests();
  const backupPassed = backupTest.results.filter(r => r.passed).length;
  totalChecks += backupTest.results.length;
  passedChecks += backupPassed;
  if (!backupTest.passed) allPassed = false;
  console.log(`  Resultado: ${backupTest.passed ? 'PASSED' : 'FAILED'} (${backupPassed}/${backupTest.results.length} aprovados)\n`);

  // 4. Suíte de Scheduler, Queue, Retry & Concorrência
  console.log('▶ [04/12] Executando Suíte de Scheduler, Queue, Retry & Concorrência (28 Verificações)...');
  const schedTest = await runSchedulerQueueRetryTests();
  const schedPassed = schedTest.results.filter(r => r.passed).length;
  totalChecks += schedTest.results.length;
  passedChecks += schedPassed;
  if (!schedTest.passed) allPassed = false;
  console.log(`  Resultado: ${schedTest.passed ? 'PASSED' : 'FAILED'} (${schedPassed}/${schedTest.results.length} aprovados)\n`);

  // 5. Suíte de Storage Providers (Local, SMB, SFTP, S3)
  console.log('▶ [05/12] Executando Suíte de Storage Providers (7 Verificações)...');
  try {
    await runStorageTestSuite();
    totalChecks += 7;
    passedChecks += 7;
    console.log('  Resultado: PASSED (7/7 provedores validados)\n');
  } catch (err: any) {
    allPassed = false;
    totalChecks += 7;
    console.error(`  Resultado: FAILED (${err.message})\n`);
  }

  // 6. Suíte de Compressão e Criptografia AEAD
  console.log('▶ [06/12] Executando Suíte de Compressão e Criptografia (18 Verificações)...');
  try {
    await runCompressionAndCryptoTestSuite();
    totalChecks += 18;
    passedChecks += 18;
    console.log('  Resultado: PASSED (18/18 verificações de cifra e compressão aprovadas)\n');
  } catch (err: any) {
    allPassed = false;
    totalChecks += 18;
    console.error(`  Resultado: FAILED (${err.message})\n`);
  }

  // 7. Suíte de Mirror & Two-Way Sync
  console.log('▶ [07/12] Executando Suíte de Mirror & Two-Way Sync (10 Verificações)...');
  const mirrorRes = await runMirrorAndSyncTests();
  const mirrorPassed = mirrorRes.results.filter(r => r.passed).length;
  totalChecks += mirrorRes.results.length;
  passedChecks += mirrorPassed;
  if (!mirrorRes.passed) allPassed = false;
  console.log(`  Resultado: ${mirrorRes.passed ? 'PASSED' : 'FAILED'} (${mirrorPassed}/${mirrorRes.results.length} aprovados)\n`);

  // 8. Suíte de Restore, Retention & Chain Resolution
  console.log('▶ [08/12] Executando Suíte de Restore & Retenção GFS (24 Verificações)...');
  const restoreRes = await runRestoreRetentionTests();
  const restorePassed = restoreRes.results.filter(r => r.passed).length;
  totalChecks += restoreRes.results.length;
  passedChecks += restorePassed;
  if (!restoreRes.passed) allPassed = false;
  console.log(`  Resultado: ${restoreRes.passed ? 'PASSED' : 'FAILED'} (${restorePassed}/${restoreRes.results.length} aprovados)\n`);

  // 9. Suíte de Resiliência & Fault Injection
  console.log('▶ [09/12] Executando Suíte de Resiliência & Injeção de Falhas (7 Verificações)...');
  const failRes = await runFailureResilienceTests();
  const failPassed = failRes.results.filter(r => r.passed).length;
  totalChecks += failRes.results.length;
  passedChecks += failPassed;
  if (!failRes.passed) allPassed = false;
  console.log(`  Resultado: ${failRes.passed ? 'PASSED' : 'FAILED'} (${failPassed}/${failRes.results.length} aprovados)\n`);

  // 10. Suíte de Endurecimento de Segurança & Zero Trust
  console.log('▶ [10/12] Executando Suíte de Segurança & Zeroization (5 Verificações)...');
  const secHardRes = await runSecurityHardeningTests();
  const secHardPassed = secHardRes.results.filter(r => r.passed).length;
  totalChecks += secHardRes.results.length;
  passedChecks += secHardPassed;
  if (!secHardRes.passed) allPassed = false;
  console.log(`  Resultado: ${secHardRes.passed ? 'PASSED' : 'FAILED'} (${secHardPassed}/${secHardRes.results.length} aprovados)\n`);

  // 11. Suíte de Cenários E2E de Missão Crítica
  console.log('▶ [11/12] Executando Suíte de Cenários E2E (6 Cenários Críticos)...');
  const e2eScnRes = await runE2EScenarios();
  const e2eScnPassed = e2eScnRes.results.filter(r => r.passed).length;
  totalChecks += e2eScnRes.results.length;
  passedChecks += e2eScnPassed;
  if (!e2eScnRes.passed) allPassed = false;
  console.log(`  Resultado: ${e2eScnRes.passed ? 'PASSED' : 'FAILED'} (${e2eScnPassed}/${e2eScnRes.results.length} aprovados)\n`);

  // 12. Suíte de Performance, Carga & Estresse
  console.log('▶ [12/12] Executando Suíte de Performance & Estresse (5 Verificações)...');
  const perfRes = await runPerformanceAndStressTests();
  const perfPassed = perfRes.results.filter(r => r.passed).length;
  totalChecks += perfRes.results.length;
  passedChecks += perfPassed;
  if (!perfRes.passed) allPassed = false;
  console.log(`  Resultado: ${perfRes.passed ? 'PASSED' : 'FAILED'} (${perfPassed}/${perfRes.results.length} aprovados)\n`);

  const totalDurationMs = Date.now() - startTime;
  console.log('================================================================================');
  console.log(`                  RELATÓRIO CONSOLIDADO — ETAPA 14`);
  console.log('================================================================================');
  console.log(`  Tempo Total: ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log(`  Total de Verificações Executadas: ${totalChecks}`);
  console.log(`  Verificações Aprovadas: ${passedChecks}`);
  console.log(`  Verificações Reprovadas: ${totalChecks - passedChecks}`);
  console.log(`  Taxa de Sucesso: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
  console.log(`  Status Final: ${allPassed ? '✅ APROVADO PARA PRODUÇÃO (GO-LIVE)' : '❌ FALHA DETECTADA'}`);
  console.log('================================================================================\n');

  if (!allPassed) {
    console.error('❌ Uma ou mais suítes apresentaram falhas.');
    process.exit(1);
  } else {
    console.log('🎉 TODAS AS 12 SUÍTES DE TESTE COMPLETAS PASSARAM COM 100% DE SUCESSO.');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal durante a execução dos testes:', err);
  process.exit(1);
});
