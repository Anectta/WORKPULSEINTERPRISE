import { EngineError, ErrorCategory } from '../core/errors.js';
import { ErrorClassifier, ErrorClassification } from './classifier.js';

export interface SmartRetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0 a 1 (ex: 0.2 = +/- 20% jitter ou full jitter)
  useFullJitter?: boolean;
}

export const DEFAULT_RETRY_CONFIG: SmartRetryConfig = {
  maxAttempts: 4,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.25,
  useFullJitter: true
};

export class SmartRetryManager {
  constructor(private readonly config: SmartRetryConfig = DEFAULT_RETRY_CONFIG) {}

  public shouldRetry(error: unknown, currentAttempt: number): { retry: boolean; delayMs: number; classification: ErrorClassification } {
    const classification = ErrorClassifier.classify(error);

    if (!classification.retryable) {
      return { retry: false, delayMs: 0, classification };
    }

    if (currentAttempt >= this.config.maxAttempts) {
      return {
        retry: false,
        delayMs: 0,
        classification: {
          ...classification,
          retryable: false,
          reason: `Limite máximo de tentativas (${this.config.maxAttempts}) atingido.`
        }
      };
    }

    const delayMs = this.calculateDelay(currentAttempt, classification.suggestedDelayMs);
    return { retry: true, delayMs, classification };
  }

  /**
   * Cálculo de Exponential Backoff com Full Jitter ou Equal Jitter.
   * Attempt 1 -> initialDelay
   * Attempt 2 -> initialDelay * multiplier
   * ...
   */
  public calculateDelay(attempt: number, overrideBaseDelayMs?: number): number {
    const base = overrideBaseDelayMs ?? (this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, Math.max(0, attempt - 1)));
    const cappedBase = Math.min(base, this.config.maxDelayMs);

    if (this.config.useFullJitter) {
      // Full Jitter (AWS Recommended Pattern): random between 0 and cappedBase
      // Garante uma média de cappedBase / 2 e mínima contenção de thundering herd
      return Math.floor(Math.random() * cappedBase);
    }

    // Decorrelated Jitter / Jitter Factor
    const jitterRange = cappedBase * this.config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.floor(Math.min(this.config.maxDelayMs, Math.max(10, cappedBase + jitter)));
  }

  public getConfig(): Readonly<SmartRetryConfig> {
    return { ...this.config };
  }
}
