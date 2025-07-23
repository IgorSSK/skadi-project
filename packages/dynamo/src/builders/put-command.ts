import {
  PutCommand as AwsPutCommand,
  type PutCommandInput,
} from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  AbstractCommand,
  type CommandOptions,
  type IConditionalCommand,
} from '../core/commands.js';
import type { TableSchema } from '../core/table-schema.js';
import { DynamoCommandError, DynamoValidationError } from '../errors/index.js';
import type { CommandResult } from '../types/index.js';

/**
 * Enhanced PUT command with builder pattern and type safety
 * Implements Command Pattern with validation and conditional expressions
 */
export class PutCommand<T extends Record<string, unknown>>
  extends AbstractCommand<void>
  implements IConditionalCommand<void>
{
  public readonly operationName = 'PutItem';

  private item: T;
  private conditionExpression?: string;
  private expressionAttributeNames?: Record<string, string>;
  private expressionAttributeValues?: Record<string, unknown>;
  private options: CommandOptions = {};

  constructor(
    client: DynamoDBDocumentClient,
    private readonly schema: TableSchema<T>,
    item: T
  ) {
    super(client, schema.name, 'PutItem');
    this.item = item;
    this.validateParameters();
  }

  /**
   * Adds condition expression for conditional puts
   */
  public withCondition(
    expression: string,
    values?: Record<string, unknown>,
    names?: Record<string, string>
  ): this {
    this.conditionExpression = expression;
    this.expressionAttributeValues = values;
    this.expressionAttributeNames = names;
    return this;
  }

  /**
   * Adds condition to prevent overwriting existing items
   */
  public withConditionNotExists(attributeName: keyof T): this {
    const placeholder = `#${String(attributeName)}`;
    return this.withCondition(
      `attribute_not_exists(${placeholder})`,
      undefined,
      { [placeholder]: String(attributeName) }
    );
  }

  /**
   * Sets return consumed capacity option
   */
  public withReturnConsumedCapacity(
    level: 'INDEXES' | 'TOTAL' | 'NONE' = 'NONE'
  ): this {
    this.options = { ...this.options, returnConsumedCapacity: level };
    return this;
  }

  /**
   * Sets return item collection metrics option
   */
  public withReturnItemCollectionMetrics(
    level: 'SIZE' | 'NONE' = 'NONE'
  ): this {
    this.options = { ...this.options, returnItemCollectionMetrics: level };
    return this;
  }

  /**
   * Validates command parameters and item against schema
   */
  protected validateParameters(): void {
    if (!this.item) {
      throw new DynamoValidationError(
        'PutCommand requires a valid item',
        undefined,
        'object',
        this.item
      );
    }

    // Validate item against schema
    if (!this.schema.validateItem(this.item)) {
      throw new DynamoValidationError(
        'Item does not match schema definition',
        undefined,
        'schema-compliant object',
        this.item
      );
    }

    // Validate that all required primary keys are present
    const primaryKeys = this.schema.extractPrimaryKeys(this.item);
    const providedKeys = Object.keys(this.item);
    const requiredKeys = Object.keys(primaryKeys);

    for (const requiredKey of requiredKeys) {
      if (
        !providedKeys.includes(requiredKey) ||
        this.item[requiredKey] == null
      ) {
        throw new DynamoValidationError(
          `Missing required primary key: ${requiredKey}`,
          requiredKey,
          'non-null value',
          this.item[requiredKey]
        );
      }
    }
  }

  /**
   * Executes the PUT command
   */
  protected async executeCommand(): Promise<void> {
    const input: PutCommandInput = {
      TableName: this.tableName,
      Item: this.item,
      ReturnConsumedCapacity: this.options.returnConsumedCapacity,
      ReturnItemCollectionMetrics: this.options.returnItemCollectionMetrics,
      ...(this.conditionExpression && {
        ConditionExpression: this.conditionExpression,
        ...(this.expressionAttributeNames && {
          ExpressionAttributeNames: this.expressionAttributeNames,
        }),
        ...(this.expressionAttributeValues && {
          ExpressionAttributeValues: this.expressionAttributeValues,
        }),
      }),
    };

    await this.client.send(new AwsPutCommand(input));
  }

  /**
   * Handles errors with enhanced context
   */
  protected handleError(error: unknown): Error {
    return DynamoCommandError.fromAWSError(
      this.operationName,
      error,
      this.createErrorContext()
    );
  }

  /**
   * Creates a builder for PUT commands
   */
  public static builder<T extends Record<string, unknown>>(
    client: DynamoDBDocumentClient,
    schema: TableSchema<T>
  ): PutCommandBuilder<T> {
    return new PutCommandBuilder(client, schema);
  }
}

/**
 * Builder for PUT commands with fluent interface
 */
export class PutCommandBuilder<T extends Record<string, unknown>> {
  private item?: T;

  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly schema: TableSchema<T>
  ) {}

  /**
   * Sets the item to be stored
   */
  public withItem(item: T): this {
    this.item = item;
    return this;
  }

  /**
   * Sets a field value on the item
   */
  public withField<K extends keyof T>(key: K, value: T[K]): this {
    this.item = { ...this.item, [key]: value } as T;
    return this;
  }

  /**
   * Builds the PUT command
   */
  public build(): PutCommand<T> {
    if (!this.item) {
      throw new Error('Item must be specified before building PutCommand');
    }

    return new PutCommand(this.client, this.schema, this.item);
  }

  /**
   * Builds and executes the command in one step
   */
  public async execute(): Promise<CommandResult<void>> {
    return this.build().execute();
  }
}
