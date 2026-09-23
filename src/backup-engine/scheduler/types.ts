import { UUID, MissedExecutionPolicy, ConcurrentExecutionPolicy, ScheduleTriggerType } from '../core/domain.js';

export type ScheduleType = 'INTERVAL' | 'DAILY' | 'DAYS_OF_WEEK' | 'WEEKLY' | 'MONTHLY' | 'CRON';

export interface ScheduleConfig {
  id: UUID;
  jobId: UUID;
  name?: string;
  enabled: boolean;
  type: ScheduleType;
  timezone: string; // Ex: 'America/Sao_Paulo', 'UTC'
  intervalSeconds?: number;
  dailyTime?: string; // Formato 'HH:mm'
  daysOfWeek?: number[]; // [0 = Domingo, 1 = Segunda, ..., 6 = Sábado]
  dayOfMonth?: number; // 1 a 31
  cronExpression?: string; // Ex: '0 2 * * *'
  runOnStartup?: boolean;
  missedPolicy: MissedExecutionPolicy;
  concurrentPolicy?: ConcurrentExecutionPolicy;
  lastRunAt?: string;
  lastScheduledAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleTriggerContext {
  scheduleId: UUID;
  jobId: UUID;
  triggerType: ScheduleTriggerType;
  scheduledTime: string;
  actualTime: string;
  isMissedExecution?: boolean;
}

export interface SchedulerMetrics {
  totalSchedules: number;
  enabledSchedules: number;
  triggersTotal: number;
  missedTriggersTotal: number;
  manualTriggersTotal: number;
  startupTriggersTotal: number;
  clockDriftsDetected: number;
}
