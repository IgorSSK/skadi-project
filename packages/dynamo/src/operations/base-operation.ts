import type {
	BatchGetCommand,
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
	TransactWriteCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export type DynamoDBBuilderCommand =
	| GetCommand
	| PutCommand
	| UpdateCommand
	| DeleteCommand
	| BatchGetCommand
	| TransactWriteCommand
	| QueryCommand;

import type { ConnectedTable } from "../client/table.js";
import { DynamoOperationError } from "../common/errors.js";

export type DynamoResult<T> = [T | null, DynamoOperationError | null];

/**
 * Abstract base class for all DynamoDB operation builders.
 * Provides common logic for table access and error handling.
 */
export abstract class BaseBuilder<TResult> {
	protected readonly table: ConnectedTable;

	constructor(table: ConnectedTable) {
		this.table = table;
	}

	/**
	 * Sends a command to DynamoDB and wraps errors in DynamoOperationError.
	 */
	protected async send<TOutput extends object>(command: DynamoDBBuilderCommand): Promise<DynamoResult<TOutput>> {
		try {
			const result = await this.table.client.send(command as unknown as Parameters<typeof this.table.client.send>[0]);
			return [result as TOutput, null];
		} catch (error: unknown) {
			return [
				null,
				new DynamoOperationError("DynamoDB operation failed", {
					cause: error,
				}),
			];
		}
	}

	/**
	 * Executes the operation and returns the result.
	 */
	public abstract exec(): Promise<DynamoResult<TResult>>;
}
