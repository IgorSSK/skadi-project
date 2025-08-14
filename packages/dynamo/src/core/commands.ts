import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { CommandResult, ErrorContext } from "../types/index.js";

/**
 * Base interface for all DynamoDB command operations
 * Implements Command Pattern with type safety and error handling
 */
export interface ICommand<TResult> {
	/**
	 * Executes the command and returns result with error handling
	 */
	execute(): Promise<CommandResult<TResult>>;

	/**
	 * Gets the operation name for logging and error context
	 */
	readonly operationName: string;
}

/**
 * Abstract base class for DynamoDB commands
 * Implements common functionality and error handling patterns
 */
export abstract class AbstractCommand<TResult> implements ICommand<TResult> {
	protected readonly client: DynamoDBDocumentClient;
	protected readonly tableName: string;
	protected readonly context: ErrorContext;

	public abstract readonly operationName: string;

	constructor(client: DynamoDBDocumentClient, tableName: string, operation: string) {
		this.client = client;
		this.tableName = tableName;
		this.context = {
			operation,
			tableName,
			timestamp: new Date(),
		};
	}

	/**
	 * Template method pattern - executes command with error handling
	 */
	public async execute(): Promise<CommandResult<TResult>> {
		try {
			const result = await this.executeCommand();
			return [result, null] as const;
		} catch (error: unknown) {
			const enhancedError = this.handleError(error);
			return [null, enhancedError] as const;
		}
	}

	/**
	 * Abstract method for concrete command implementation
	 */
	protected abstract executeCommand(): Promise<TResult>;

	/**
	 * Handles errors and adds context information
	 */
	protected abstract handleError(error: unknown): Error;

	/**
	 * Validates command parameters before execution
	 */
	protected abstract validateParameters(): void;

	/**
	 * Creates operation context for error handling
	 */
	protected createErrorContext(): ErrorContext {
		return {
			...this.context,
			timestamp: new Date(),
		};
	}
}

/**
 * Interface for commands that support conditional expressions
 */
export interface IConditionalCommand<TResult> extends ICommand<TResult> {
	/**
	 * Adds a condition expression to the command
	 */
	withCondition(expression: string, values?: Record<string, unknown>): this;
}

/**
 * Interface for commands that support projection expressions
 */
export interface IProjectionCommand<TResult> extends ICommand<TResult> {
	/**
	 * Adds projection expression to limit returned attributes
	 */
	withProjection(attributes: string[]): this;
}

/**
 * Interface for paginated query commands
 */
export interface IPaginatedCommand<TResult> extends ICommand<TResult> {
	/**
	 * Sets the maximum number of items to return
	 */
	withLimit(limit: number): this;

	/**
	 * Sets the exclusive start key for pagination
	 */
	withExclusiveStartKey(key: Record<string, unknown>): this;
}

/**
 * Command builder interface for fluent API construction
 */
export interface ICommandBuilder<TCommand extends ICommand<unknown>> {
	/**
	 * Builds and returns the configured command
	 */
	build(): TCommand;

	/**
	 * Validates the builder configuration
	 */
	validate(): boolean;
}

/**
 * Factory interface for creating DynamoDB clients
 * Implements Abstract Factory Pattern
 */
export interface IClientFactory {
	/**
	 * Creates a DynamoDB document client for the specified region
	 */
	createDocumentClient(region: string): DynamoDBDocumentClient;

	/**
	 * Creates a DynamoDB client for the specified region
	 */
	createClient(region: string): DynamoDBClient;
}

/**
 * Configuration options for command execution
 */
export interface CommandOptions {
	readonly retryCount?: number;
	readonly timeout?: number;
	readonly consistentRead?: boolean;
	readonly returnConsumedCapacity?: "INDEXES" | "TOTAL" | "NONE";
	readonly returnItemCollectionMetrics?: "SIZE" | "NONE";
}

/**
 * Result wrapper for commands that may return metadata
 */
export interface CommandResultWithMetadata<TData> {
	readonly data: TData;
	readonly metadata?: {
		readonly consumedCapacity?: unknown;
		readonly itemCollectionMetrics?: unknown;
		readonly scannedCount?: number;
		readonly count?: number;
		readonly lastEvaluatedKey?: Record<string, unknown>;
	};
}

/**
 * Batch operation request structure
 */
export interface BatchOperationRequest<T> {
	readonly tableName: string;
	readonly operations: ReadonlyArray<{
		readonly type: "PUT" | "DELETE" | "GET";
		readonly item?: T;
		readonly key?: Partial<T>;
	}>;
}

/**
 * Transaction operation request structure
 */
export interface TransactionRequest {
	readonly operations: ReadonlyArray<{
		readonly tableName: string;
		readonly operation: "PUT" | "UPDATE" | "DELETE" | "CONDITION_CHECK";
		readonly item?: Record<string, unknown>;
		readonly key?: Record<string, unknown>;
		readonly updateExpression?: string;
		readonly conditionExpression?: string;
		readonly expressionAttributeNames?: Record<string, string>;
		readonly expressionAttributeValues?: Record<string, unknown>;
	}>;
}
