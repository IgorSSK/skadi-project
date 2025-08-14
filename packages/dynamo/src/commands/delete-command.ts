// ...existing code...
/**
 * DeleteCommand - Remoção de item
 */

import type { CommandKey } from "../lib/command-types.js";
import type { TableSchema } from "../schema/table-schema.js";

export class DeleteCommand<TSchema extends TableSchema<unknown>> {
	constructor(
		private readonly schema: TSchema,
		private readonly keys: Partial<CommandKey<TSchema>>,
		// ...existing code...
	) {}

	async exec(): Promise<[null, Error | null]> {
		try {
			// Internal usage to avoid unused private member warnings until real implementation
			void this.schema;
			void this.keys;
			// Exemplo de uso real:
			// const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }));
			// await client.send(new AwsDeleteCommand({ TableName: this.schema.name, Key: this.keys }));
			return [null, null];
		} catch (error) {
			return [null, error as Error];
		}
	}
}
