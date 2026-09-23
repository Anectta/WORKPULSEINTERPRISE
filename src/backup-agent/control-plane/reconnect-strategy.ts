export interface ReconnectPolicyConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number; // 0.0 a 1.0 (ex: 0.2 = +/- 20% jitter)
  maxAttempts?: number;
}

export class ReconnectStrategy {
  private attempt = 0;

  constructor(private readonly config: ReconnectPolicyConfig) {}

  public getNextDelay(): number {
    this.attempt++;

    // Backoff exponencial: baseDelay * 2^(attempt - 1)
    const exponential = this.config.baseDelayMs * Math.pow(2, this.attempt - 1);
    const capped = Math.min(exponential, this.config.maxDelayMs);

    // Jitter para prevenir thundering herd problem (tempestade de conexões simultâneas)
    const jitter = capped * this.config.jitterFactor * (Math.random() * 2 - 1);
    const finalDelay = Math.max(this.config.baseDelayMs, Math.round(capped + jitter));

    return finalDelay;
  }

  public getAttemptCount(): number {
    return this.attempt;
  }

  public reset(): void {
    this.attempt = 0;
  }

  public hasExceededMaxAttempts(): boolean {
    if (this.config.maxAttempts === undefined || this.config.maxAttempts <= 0) {
      return false;
    }
    return this.attempt >= this.config.maxAttempts;
  }
}
