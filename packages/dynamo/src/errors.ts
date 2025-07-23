/** Base class for all Skadi Dynamo errors */
export class SkadiDynamoError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/** Thrown when entity validation fails */
export class EntityValidationError extends SkadiDynamoError {
  public readonly issues?: unknown[];
  constructor(message: string, issues?: unknown[]) {
    super('ENTITY_VALIDATION_ERROR', message);
    this.issues = issues;
  }
}

/** Thrown when a required key is missing for an operation */
export class MissingKeyError extends SkadiDynamoError {
  constructor(message: string) {
    super('MISSING_KEY_ERROR', message);
  }
}

/** Thrown for general DynamoDB operation failures */
export class DynamoOperationError extends SkadiDynamoError {
  public override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super('DYNAMO_OPERATION_ERROR', message);
    this.cause = cause;
  }
}
