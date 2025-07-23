import type { ErrorContext } from '../types/index.js';

/**
 * Base error class for all DynamoDB operations
 * Implements proper error hierarchy and context tracking
 */
export abstract class DynamoError extends Error {
  public readonly timestamp: Date;
  public readonly context?: ErrorContext;
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    context?: ErrorContext,
    code?: string,
    retryable = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    this.code = code;
    this.retryable = retryable;

    // Maintains proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes error for structured logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      code: this.code,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * Command execution errors for failed DynamoDB operations
 */
export class DynamoCommandError extends DynamoError {
  public readonly operation: string;
  public readonly originalError: unknown;

  constructor(
    operation: string,
    message: string,
    originalError: unknown,
    context?: ErrorContext
  ) {
    const isRetryable = DynamoCommandError.isRetryableError(originalError);
    super(
      message,
      context,
      DynamoCommandError.extractErrorCode(originalError),
      isRetryable
    );

    this.operation = operation;
    this.originalError = originalError;
  }

  /**
   * Creates a command error from AWS SDK error
   */
  public static fromAWSError(
    operation: string,
    error: unknown,
    context?: ErrorContext
  ): DynamoCommandError {
    const message = DynamoCommandError.extractErrorMessage(error);
    return new DynamoCommandError(operation, message, error, context);
  }

  /**
   * Determines if an error is retryable
   */
  private static isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const errorCode = DynamoCommandError.extractErrorCode(error);
    const retryableCodes = [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'ServiceUnavailable',
      'InternalServerError',
    ];

    return retryableCodes.includes(errorCode || '');
  }

  /**
   * Extracts error code from AWS SDK error
   */
  private static extractErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;

    const errorObj = error as Record<string, unknown>;
    return (errorObj.name as string) || (errorObj.code as string) || undefined;
  }

  /**
   * Extracts error message from AWS SDK error
   */
  private static extractErrorMessage(error: unknown): string {
    if (!error) return 'Unknown error occurred';

    if (typeof error === 'string') return error;

    if (error instanceof Error) return error.message;

    if (typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      return (errorObj.message as string) || 'Unknown error occurred';
    }

    return 'Unknown error occurred';
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      originalError:
        this.originalError instanceof Error
          ? {
              name: this.originalError.name,
              message: this.originalError.message,
              stack: this.originalError.stack,
            }
          : this.originalError,
    };
  }
}

/**
 * Schema validation errors
 */
export class DynamoValidationError extends DynamoError {
  public readonly field?: string;
  public readonly expectedType?: string;
  public readonly actualValue?: unknown;

  constructor(
    message: string,
    field?: string,
    expectedType?: string,
    actualValue?: unknown,
    context?: ErrorContext
  ) {
    super(message, context, 'ValidationError', false);
    this.field = field;
    this.expectedType = expectedType;
    this.actualValue = actualValue;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      expectedType: this.expectedType,
      actualValue: this.actualValue,
    };
  }
}

/**
 * Configuration errors for invalid table setup
 */
export class DynamoConfigurationError extends DynamoError {
  constructor(message: string, context?: ErrorContext) {
    super(message, context, 'ConfigurationError', false);
  }
}

/**
 * Connection and client errors
 */
export class DynamoConnectionError extends DynamoError {
  public readonly endpoint?: string;
  public readonly region?: string;

  constructor(
    message: string,
    endpoint?: string,
    region?: string,
    context?: ErrorContext
  ) {
    super(message, context, 'ConnectionError', true);
    this.endpoint = endpoint;
    this.region = region;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      endpoint: this.endpoint,
      region: this.region,
    };
  }
}
