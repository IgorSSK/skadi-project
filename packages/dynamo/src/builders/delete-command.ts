import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand as AwsDeleteCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type { TableSchema } from '../core/table-schema.js';
import { DynamoCommandError } from '../errors/dynamo-command-error.js';
import type { CommandKey } from '../interfaces/command-types.js';

/**
 * Builder para operação de remoção (Delete) no DynamoDB.
 * @template TSchema - Tipo do schema da tabela
 */
export class DeleteCommand<
  TSchema extends TableSchema<Record<string, unknown>>,
> {
  constructor(
    private readonly schema: TSchema,
    private readonly keys: Partial<CommandKey<TSchema>>,
    private readonly region: string
  ) {}

  /**
   * Executa a operação de remoção e retorna [null, error]
   * @returns {[null, Error | null]}
   */
  async exec(): Promise<[null, Error | null]> {
    try {
      const client = DynamoDBDocumentClient.from(
        new DynamoDBClient({ region: this.region })
      );
      await client.send(
        new AwsDeleteCommand({
          TableName: this.schema.name,
          Key: this.keys,
        })
      );
      return [null, null];
    } catch (error: unknown) {
      return [
        null,
        new DynamoCommandError('Erro ao executar DeleteCommand', error),
      ];
    }
  }
}
