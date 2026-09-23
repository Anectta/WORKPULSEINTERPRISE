import { CronExpressionParser } from 'cron-parser';
import { ScheduleConfig, ScheduleType } from './types.js';
import { MissedExecutionPolicy } from '../core/domain.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export interface ScheduleEvaluationResult {
  nextRunAt: string;
  isMissed: boolean;
  missedScheduledTime?: string;
  shouldRunImmediately: boolean;
}

export class ScheduleEvaluator {
  /**
   * Converte a configuração de Schedule em uma expressão cron compatível com timezone,
   * ou calcula diretamente no caso de intervalo.
   */
  public static getNextRun(schedule: ScheduleConfig, fromDate: Date = new Date()): Date {
    const tz = schedule.timezone || 'UTC';

    if (schedule.type === 'INTERVAL') {
      const intervalSec = schedule.intervalSeconds ?? 3600;
      if (intervalSec <= 0) {
        throw new EngineError({
          code: 'INVALID_SCHEDULE_INTERVAL',
          message: `Intervalo de agendamento deve ser positivo: ${intervalSec}`,
          category: ErrorCategory.CONFIGURATION
        });
      }
      return new Date(fromDate.getTime() + intervalSec * 1000);
    }

    const cronExpr = this.toCronExpression(schedule);
    try {
      const parsed = CronExpressionParser.parse(cronExpr, {
        currentDate: fromDate,
        tz
      });
      return parsed.next().toDate();
    } catch (err: any) {
      throw new EngineError({
        code: 'SCHEDULE_CRON_PARSE_FAILED',
        message: `Falha ao interpretar agendamento (${schedule.type}): ${err.message}`,
        category: ErrorCategory.CONFIGURATION,
        cause: err
      });
    }
  }

  /**
   * Obtém a execução que deveria ter ocorrido imediatamente antes de 'fromDate'.
   */
  public static getPreviousRun(schedule: ScheduleConfig, fromDate: Date = new Date()): Date {
    const tz = schedule.timezone || 'UTC';

    if (schedule.type === 'INTERVAL') {
      const intervalSec = schedule.intervalSeconds ?? 3600;
      return new Date(fromDate.getTime() - intervalSec * 1000);
    }

    const cronExpr = this.toCronExpression(schedule);
    try {
      const parsed = CronExpressionParser.parse(cronExpr, {
        currentDate: fromDate,
        tz
      });
      return parsed.prev().toDate();
    } catch (err: any) {
      throw new EngineError({
        code: 'SCHEDULE_CRON_PARSE_FAILED',
        message: `Falha ao interpretar agendamento anterior (${schedule.type}): ${err.message}`,
        category: ErrorCategory.CONFIGURATION,
        cause: err
      });
    }
  }

  /**
   * Avalia se houve uma execução perdida entre a última execução (ou agendamento) e o instante atual.
   */
  public static evaluate(schedule: ScheduleConfig, currentTime: Date = new Date()): ScheduleEvaluationResult {
    const nextFutureDate = this.getNextRun(schedule, currentTime);
    const nextRunAt = nextFutureDate.toISOString();

    // Se o agendamento nunca rodou antes, usamos a data de criação ou última referência
    const lastReference = schedule.lastRunAt || schedule.lastScheduledAt;

    if (!lastReference) {
      return {
        nextRunAt,
        isMissed: false,
        shouldRunImmediately: false
      };
    }

    const lastRefDate = new Date(lastReference);
    const previousExpected = this.getPreviousRun(schedule, currentTime);

    // Se o horário esperado anterior for posterior à última referência, houve um pulo (missed run)
    const isMissed = previousExpected.getTime() > lastRefDate.getTime();

    let shouldRunImmediately = false;
    if (isMissed) {
      switch (schedule.missedPolicy) {
        case MissedExecutionPolicy.RUN_IMMEDIATELY:
          shouldRunImmediately = true;
          break;
        case MissedExecutionPolicy.SKIP:
        case MissedExecutionPolicy.RUN_NEXT_SCHEDULED_TIME:
        default:
          shouldRunImmediately = false;
          break;
      }
    }

    return {
      nextRunAt,
      isMissed,
      missedScheduledTime: isMissed ? previousExpected.toISOString() : undefined,
      shouldRunImmediately
    };
  }

  /**
   * Converte tipos de agendamento em expressão Cron padronizada
   */
  public static toCronExpression(schedule: ScheduleConfig): string {
    switch (schedule.type) {
      case 'CRON':
        if (!schedule.cronExpression) {
          throw new EngineError({
            code: 'INVALID_CRON_SCHEDULE',
            message: 'cronExpression é obrigatório para agendamentos do tipo CRON',
            category: ErrorCategory.CONFIGURATION
          });
        }
        return schedule.cronExpression;

      case 'DAILY': {
        const { hour, minute } = this.parseTime(schedule.dailyTime || '00:00');
        return `${minute} ${hour} * * *`;
      }

      case 'DAYS_OF_WEEK': {
        const { hour, minute } = this.parseTime(schedule.dailyTime || '00:00');
        const days = schedule.daysOfWeek && schedule.daysOfWeek.length > 0 ? schedule.daysOfWeek.join(',') : '*';
        return `${minute} ${hour} * * ${days}`;
      }

      case 'WEEKLY': {
        const { hour, minute } = this.parseTime(schedule.dailyTime || '03:00');
        const day = schedule.daysOfWeek && schedule.daysOfWeek.length > 0 ? schedule.daysOfWeek[0] : 0; // Default: Domingo (0)
        return `${minute} ${hour} * * ${day}`;
      }

      case 'MONTHLY': {
        const { hour, minute } = this.parseTime(schedule.dailyTime || '02:00');
        const dayOfMonth = schedule.dayOfMonth && schedule.dayOfMonth >= 1 && schedule.dayOfMonth <= 31 ? schedule.dayOfMonth : 1;
        return `${minute} ${hour} ${dayOfMonth} * *`;
      }

      case 'INTERVAL':
        throw new EngineError({
          code: 'INTERVAL_NOT_CRON',
          message: 'Intervalos não devem ser convertidos em Cron estático',
          category: ErrorCategory.CONFIGURATION
        });

      default:
        throw new EngineError({
          code: 'UNSUPPORTED_SCHEDULE_TYPE',
          message: `Tipo de agendamento não suportado: ${(schedule as any).type}`,
          category: ErrorCategory.CONFIGURATION
        });
    }
  }

  private static parseTime(timeStr: string): { hour: number; minute: number } {
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1] || '0', 10);

    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      throw new EngineError({
        code: 'INVALID_TIME_FORMAT',
        message: `Formato de hora inválido (esperado HH:mm): "${timeStr}"`,
        category: ErrorCategory.CONFIGURATION
      });
    }

    return { hour, minute };
  }
}
