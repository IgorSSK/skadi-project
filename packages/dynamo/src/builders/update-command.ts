import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand as AwsUpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { TableSchema } from "../core/table-schema.js";
import { DynamoCommandError } from "../errors/dynamo-command-error.js";
import type { CommandItem, CommandKey } from "../interfaces/command-types.js";

/**
 * Builder para operação de atualização (Update) no DynamoDB.
 * @template TSchema - Tipo do schema da tabela
 */
export class UpdateCommand<TSchema extends TableSchema<Record<string, unknown>>> {
	constructor(
		private readonly schema: TSchema,
		private readonly keys: Partial<CommandKey<TSchema>>,
		private readonly updates: Partial<CommandItem<TSchema>>,
		private readonly region: string,
	) {}

	/**
	 * Executa a operação de atualização e retorna [null, error]
	 * @returns {[null, Error | null]}
	 */
	async exec(): Promise<[null, Error | null]> {
		try {
			// Monta a expressão de atualização dinamicamente
			const updateKeys = Object.keys(this.updates);
			if (updateKeys.length === 0) {
				return [null, new DynamoCommandError("Nenhum campo para atualizar", null)];
			}
			const UpdateExpression = `SET ${updateKeys.map((k) => `#${k} = :${k}`).join(", ")}`;
			const ExpressionAttributeNames = Object.fromEntries(updateKeys.map((k) => [`#${k}`, k]));
			const ExpressionAttributeValues = Object.fromEntries(
				updateKeys.map((k) => [`:${k}`, (this.updates as Record<string, unknown>)[k]]),
			);
			const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }));
			await client.send(
				new AwsUpdateCommand({
					TableName: this.schema.name,
					Key: this.keys,
					UpdateExpression,
					ExpressionAttributeNames,
					ExpressionAttributeValues,
				}),
			);
			return [null, null];
		} catch (error: unknown) {
			return [null, new DynamoCommandError("Erro ao executar UpdateCommand", error)];
		}
	}
}
