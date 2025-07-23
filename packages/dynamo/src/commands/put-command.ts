import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  PutCommand as AwsPutCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
/**
 * PutCommand - Criação de item no DynamoDB
 */

import type { TableSchema } from '../schema/table-schema.js';
import type { CommandItem } from '../lib/command-types.js';


export class PutCommand<TSchema extends TableSchema<unknown>> {
  constructor(
    private readonly schema: TSchema,
    private readonly item: CommandItem<TSchema>,
    private readonly region: string
  ) {}

  async exec(): Promise<[null, Error | null]> {
    try {
      const client = DynamoDBDocumentClient.from(
        new DynamoDBClient({ region: this.region })
      );
      await client.send(
        new AwsPutCommand({
          TableName: this.schema.name,
          Item: this.item,
        })
      );
      return [null, null];
    } catch (error) {
      return [null, error as Error];
    }
  }
}
