import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand as AwsQueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { TableSchema } from "../core/table-schema.js";
import { DynamoCommandError } from "../errors/dynamo-command-error.js";
import type { CommandItem, CommandKey } from "../interfaces/command-types.js";

/**
 * Builder para operação de consulta (Query) no DynamoDB.
 * @template TSchema - Tipo do schema da tabela
 */
export class QueryCommand<TSchema extends TableSchema<Record<string, unknown>>> {
	constructor(
		private readonly schema: TSchema,
		private readonly partitionKeyName: keyof CommandKey<TSchema>,
		private readonly partitionKeyValue: unknown,
		private readonly region: string,
	) {}

	/**
	 * Executa a operação de consulta e retorna [itens, error]
	 * @returns {[CommandItem<TSchema>[], Error | null]}
	 */
	async exec(): Promise<[CommandItem<TSchema>[], Error | null]> {
		try {
			const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }));
			const keyName = String(this.partitionKeyName);
			const result = await client.send(
				new AwsQueryCommand({
					TableName: this.schema.name,
					KeyConditionExpression: "#pk = :pk",
					ExpressionAttributeNames: { "#pk": keyName },
					ExpressionAttributeValues: { ":pk": this.partitionKeyValue },
				}),
			);
			return [(result.Items as CommandItem<TSchema>[]) ?? [], null];
		} catch (error: unknown) {
			return [[], new DynamoCommandError("Erro ao executar QueryCommand", error)];
		}
	}
}
