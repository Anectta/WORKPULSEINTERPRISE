import { UUID } from './domain.js';

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  FILESYSTEM = 'FILESYSTEM',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  ENCRYPTION = 'ENCRYPTION',
  COMPRESSION = 'COMPRESSION',
  INTEGRITY = 'INTEGRITY',
  CORRUPTION = 'CORRUPTION',
  SECURITY = 'SECURITY',
  CONFIGURATION = 'CONFIGURATION',
  INTERNAL = 'INTERNAL',
  CANCELLATION = 'CANCELLATION',
  SAFETY = 'SAFETY',
  CONFLICT = 'CONFLICT'
}

export class EngineError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(params: {
    code: string;
    message: string;
    category: ErrorCategory;
    cause?: Error | unknown;
    context?: Record<string, unknown>;
    recoverable?: boolean;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = 'EngineError';
    this.code = params.code;
    this.category = params.category;
    this.context = params.context;
    this.recoverable = params.recoverable ?? false;
    this.retryable = params.retryable ?? false;
    this.timestamp = new Date().toISOString();
    if (params.cause) {
      this.cause = params.cause;
    }
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
      timestamp: this.timestamp
    };
  }
}

export class RetryPolicy {
  constructor(
    public readonly maxRetries: number = 3,
    public readonly initialIntervalMs: number = 1000,
    public readonly backoffMultiplier: number = 2,
    public readonly maxIntervalMs: number = 30000,
    public readonly retryableCategories: ErrorCategory[] = [
      ErrorCategory.NETWORK,
      ErrorCategory.STORAGE,
      ErrorCategory.FILESYSTEM
    ]
  ) {}

  public isRetryable(error: EngineError): boolean {
    if (!error.retryable) return false;
    return this.retryableCategories.includes(error.category);
  }

  public getDelay(attempt: number): number {
    const delay = this.initialIntervalMs * Math.pow(this.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * (delay * 0.1);
    return Math.min(delay + jitter, this.maxIntervalMs);
  }
}

export class CancellationToken {
  private _isCancelled = false;
  private _reason?: string;
  private readonly listeners: Array<(reason?: string) => void> = [];

  public get isCancelled(): boolean {
    return this._isCancelled;
  }

  public get reason(): string | undefined {
    return this._reason;
  }

  public cancel(reason = 'Operation cancelled by user or scheduler'): void {
    if (this._isCancelled) return;
    this._isCancelled = true;
    this._reason = reason;
    for (const listener of this.listeners) {
      try {
        listener(reason);
      } catch (err) {
        console.error('Error in cancellation listener:', err);
      }
    }
  }

  public toEngineError(): EngineError {
    return new EngineError({
      code: 'OPERATION_CANCELLED',
      message: this._reason || 'The backup operation was cancelled.',
      category: ErrorCategory.CANCELLATION,
      recoverable: false,
      retryable: false
    });
  }

  public throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new EngineError({
        code: 'OPERATION_CANCELLED',
        message: this._reason || 'The backup operation was cancelled.',
        category: ErrorCategory.CANCELLATION,
        recoverable: false,
        retryable: false
      });
    }
  }

  public onCancelled(callback: (reason?: string) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }
}
