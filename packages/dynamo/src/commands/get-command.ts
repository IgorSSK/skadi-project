import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand as AwsGetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
/**
 * GetCommand - Consulta de item por chave primária
 */

import type { TableSchema } from "../schema/table-schema.js";
import type { CommandKey, CommandItem } from "../lib/command-types.js";

export class GetCommand<TSchema extends TableSchema<unknown>> {
	constructor(
		private readonly schema: TSchema,
		private readonly keys: Partial<CommandKey<TSchema>>,
		private readonly region: string,
	) {}

	/**
	 * Executa a consulta e retorna [item, error]
	 */
	async exec(): Promise<[CommandItem<TSchema> | null, Error | null]> {
		try {
			const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }));
			const result = await client.send(
				new AwsGetCommand({
					TableName: this.schema.name,
					Key: this.keys,
				}),
			);
			return [(result.Item as CommandItem<TSchema>) ?? null, null];
		} catch (error) {
			return [null, error as Error];
		}
	}
}
