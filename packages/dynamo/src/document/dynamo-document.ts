import { DeleteCommand } from '../commands/delete-command.js';
import { GetCommand } from '../commands/get-command.js';
import { PutCommand } from '../commands/put-command.js';
import { QueryCommand } from '../commands/query-command.js';
import { UpdateCommand } from '../commands/update-command.js';
import type { TableSchema } from '../schema/table-schema.js';
import type {
  ExtractPrimaryKeys,
  InferItemType,
} from '../types/schema-utils.js';

/**
 * Opções para instanciar o DynamoDocument
 */
export interface DynamoDocumentOptions<T> {
  schema: TableSchema<T>;
  region: string;
}

/**
 * Classe principal para operações Document Mapper no DynamoDB
 */
export class DynamoDocument<T> {
  readonly schema: TableSchema<T>;
  readonly region: string;

  constructor(options: DynamoDocumentOptions<T>) {
    this.schema = options.schema;
    this.region = options.region;
  }

  /**
   * Cria um novo item na tabela
   */
  async put(
    item: InferItemType<TableSchema<T>['definition']>
  ): Promise<[null, Error | null]> {
    return await new PutCommand(this.schema, item, this.region).exec();
  }

  /**
   * Busca um item por chave primária
   */
  async get(
    keys: Partial<ExtractPrimaryKeys<TableSchema<T>['definition']>>
  ): Promise<
    [InferItemType<TableSchema<T>['definition']> | null, Error | null]
  > {
    return await new GetCommand(this.schema, keys, this.region).exec();
  }

  /**
   * Atualiza campos de um item
   */
  async update(
    keys: Partial<ExtractPrimaryKeys<TableSchema<T>['definition']>>,
    updates: Partial<InferItemType<TableSchema<T>['definition']>>
  ): Promise<[null, Error | null]> {
    return await new UpdateCommand(this.schema, keys, updates).exec();
  }

  /**
   * Remove um item da tabela
   */
  async delete(
    keys: Partial<ExtractPrimaryKeys<TableSchema<T>['definition']>>
  ): Promise<[null, Error | null]> {
    return await new DeleteCommand(this.schema, keys).exec();
  }

  /**
   * Realiza uma consulta (query) na tabela
   */
  async query(
    params: Partial<ExtractPrimaryKeys<TableSchema<T>['definition']>>
  ): Promise<[InferItemType<TableSchema<T>['definition']>[], Error | null]> {
    return await new QueryCommand(this.schema, params).exec();
  }
}
