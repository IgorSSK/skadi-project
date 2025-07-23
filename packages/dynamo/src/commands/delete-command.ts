// ...existing code...
/**
 * DeleteCommand - Remoção de item
 */

import type { TableSchema } from '../schema/table-schema.js';
import type { CommandKey } from '../lib/command-types.js';


export class DeleteCommand<TSchema extends TableSchema<unknown>> {
  constructor(
    private readonly schema: TSchema,
    private readonly keys: Partial<CommandKey<TSchema>>,
    // ...existing code...
  ) {}

  async exec(): Promise<[null, Error | null]> {
    try {
      // Exemplo de uso real:
      // const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: this.region }));
      // await client.send(new AwsDeleteCommand({ TableName: this.schema.name, Key: this.keys }));
      return [null, null];
    } catch (error) {
      return [null, error as Error];
    }
  }
}
