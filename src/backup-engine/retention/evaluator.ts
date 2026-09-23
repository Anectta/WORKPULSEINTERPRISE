import { BackupExecution, UUID } from '../core/domain.js';
import { RetentionPolicy, RetentionPreviewItem } from './types.js';

export class RetentionEvaluator {
  /**
   * Avalia uma lista de execuções contra a RetentionPolicy usando modelo GFS e regras de tempo/quantidade.
   * Retorna os itens categorizados inicialmente como KEEP, DELETE ou PROTECTED.
   */
  public static evaluatePolicy(
    executions: BackupExecution[],
    policy: RetentionPolicy,
    referenceDate: Date = new Date()
  ): RetentionPreviewItem[] {
    // Ordena do mais recente para o mais antigo
    const sorted = [...executions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    const keepSet = new Map<UUID, string>(); // executionId -> reason

    // 1. Regra de Proteção Manual / Legal Hold
    for (const exec of sorted) {
      if (exec.isProtected) {
        keepSet.set(exec.executionId, 'Execução marcada explicitamente como PROTECTED (Legal Hold).');
      }
    }

    // 2. Regra: keepLastN
    if (policy.keepLastN && policy.keepLastN > 0) {
      const topN = sorted.slice(0, policy.keepLastN);
      for (const exec of topN) {
        if (!keepSet.has(exec.executionId)) {
          keepSet.set(exec.executionId, `Mantido pela regra keepLastN (${policy.keepLastN} mais recentes).`);
        }
      }
    }

    // 3. Regra: keepForDays
    if (policy.keepForDays && policy.keepForDays > 0) {
      const cutoffTime = referenceDate.getTime() - policy.keepForDays * 24 * 60 * 60 * 1000;
      for (const exec of sorted) {
        if (new Date(exec.startedAt).getTime() >= cutoffTime) {
          if (!keepSet.has(exec.executionId)) {
            keepSet.set(exec.executionId, `Mantido pela regra keepForDays (< ${policy.keepForDays} dias).`);
          }
        }
      }
    }

    // 4. Regra: keepDaily (1 por dia nos últimos D dias)
    if (policy.keepDaily && policy.keepDaily > 0) {
      const seenDays = new Set<string>();
      const cutoffTime = referenceDate.getTime() - policy.keepDaily * 24 * 60 * 60 * 1000;

      for (const exec of sorted) {
        const execTime = new Date(exec.startedAt).getTime();
        if (execTime >= cutoffTime) {
          const dayKey = exec.startedAt.slice(0, 10); // YYYY-MM-DD
          if (!seenDays.has(dayKey)) {
            seenDays.add(dayKey);
            if (!keepSet.has(exec.executionId)) {
              keepSet.set(exec.executionId, `Mantido pela regra keepDaily (dia ${dayKey}).`);
            }
          }
        }
      }
    }

    // 5. Regra: keepWeekly (1 por semana nas últimas W semanas)
    if (policy.keepWeekly && policy.keepWeekly > 0) {
      const seenWeeks = new Set<string>();
      const cutoffTime = referenceDate.getTime() - policy.keepWeekly * 7 * 24 * 60 * 60 * 1000;

      for (const exec of sorted) {
        const execTime = new Date(exec.startedAt).getTime();
        if (execTime >= cutoffTime) {
          const d = new Date(exec.startedAt);
          // Calcula semana ISO
          const startOfYear = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
          const weekKey = `${d.getFullYear()}-W${weekNum}`;

          if (!seenWeeks.has(weekKey)) {
            seenWeeks.add(weekKey);
            if (!keepSet.has(exec.executionId)) {
              keepSet.set(exec.executionId, `Mantido pela regra keepWeekly (semana ${weekKey}).`);
            }
          }
        }
      }
    }

    // 6. Regra: keepMonthly (1 por mês nos últimos M meses)
    if (policy.keepMonthly && policy.keepMonthly > 0) {
      const seenMonths = new Set<string>();
      const cutoffTime = referenceDate.getTime() - policy.keepMonthly * 30.5 * 24 * 60 * 60 * 1000;

      for (const exec of sorted) {
        const execTime = new Date(exec.startedAt).getTime();
        if (execTime >= cutoffTime) {
          const monthKey = exec.startedAt.slice(0, 7); // YYYY-MM
          if (!seenMonths.has(monthKey)) {
            seenMonths.add(monthKey);
            if (!keepSet.has(exec.executionId)) {
              keepSet.set(exec.executionId, `Mantido pela regra keepMonthly (mês ${monthKey}).`);
            }
          }
        }
      }
    }

    // 7. Regra: keepYearly (1 por ano nos últimos Y anos)
    if (policy.keepYearly && policy.keepYearly > 0) {
      const seenYears = new Set<string>();
      const cutoffTime = referenceDate.getTime() - policy.keepYearly * 365.25 * 24 * 60 * 60 * 1000;

      for (const exec of sorted) {
        const execTime = new Date(exec.startedAt).getTime();
        if (execTime >= cutoffTime) {
          const yearKey = exec.startedAt.slice(0, 4); // YYYY
          if (!seenYears.has(yearKey)) {
            seenYears.add(yearKey);
            if (!keepSet.has(exec.executionId)) {
              keepSet.set(exec.executionId, `Mantido pela regra keepYearly (ano ${yearKey}).`);
            }
          }
        }
      }
    }

    // 8. Construção dos itens de avaliação preliminar
    return sorted.map(exec => {
      const isProt = Boolean(exec.isProtected);
      const isKept = keepSet.has(exec.executionId);
      const reason = keepSet.get(exec.executionId) || 'Não atende a nenhuma regra de retenção ativa.';

      let action: 'KEEP' | 'DELETE' | 'PROTECTED' = 'DELETE';
      if (isProt) {
        action = 'PROTECTED';
      } else if (isKept) {
        action = 'KEEP';
      }

      return {
        executionId: exec.executionId,
        jobId: exec.jobId,
        executionType: exec.executionType,
        startedAt: exec.startedAt,
        action,
        reason,
        dependentExecutionIds: [],
        isProtected: isProt,
        sizeBytes: exec.bytesProcessed || exec.bytesTransferred || 0
      };
    });
  }
}
