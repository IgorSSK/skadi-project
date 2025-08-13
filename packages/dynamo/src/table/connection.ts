import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { GSIDefinition } from '../types.js';
import type { CaseTransformer } from '../utils/transformer.js';

export interface TableOptions {
  caseStyle?: CaseTransformer;
  clientConfig?: DynamoDBClientConfig;
}

export interface ConnectedTable {
  tableName: string;
  client: DynamoDBDocumentClient;
  gsis: GSIDefinition[];
  options: TableOptions;
  getGsiByAlias(alias: string): GSIDefinition | undefined;
}

export class Table {
  private tableName?: string;
  private clientInstance?: DynamoDBDocumentClient;
  private gsiList: GSIDefinition[] = [];
  private tableOptions: TableOptions = {};

  /** Inicializa a conexão com o nome da tabela e região opcional */
  public static connect(name: string, region?: string) {
    const table = new Table();
    table.tableName = name;
    if (region) {
      table.tableOptions.clientConfig = { region };
    }
    return table;
  }

  /** Define configurações do cliente DynamoDB */
  public config(config: DynamoDBClientConfig) {
    this.tableOptions.clientConfig = config;
    return this;
  }

  /** Define uma instância customizada do DynamoDBDocumentClient */
  public client(client: DynamoDBDocumentClient) {
    this.clientInstance = client;
    return this;
  }

  /** Define as GSIs da tabela */
  public gsis(gsis: GSIDefinition[]) {
    this.gsiList = gsis;
    return this;
  }

  /** Define opções adicionais da tabela */
  public options(options: TableOptions) {
    this.tableOptions = options;
    return this;
  }

  /**
   * Constrói o objeto ConnectedTable final e imutável.
   * Se nenhum client for definido, cria um padrão.
   */
  public build(): ConnectedTable {
    if (!this.tableName) {
      throw new Error(
        'Table name is required. Use Table.connect(name) to set it.'
      );
    }

    const client =
      this.clientInstance ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient(this.tableOptions.clientConfig ?? {})
      );

    return {
      tableName: this.tableName,
      client,
      gsis: this.gsiList,
      options: this.tableOptions,
      getGsiByAlias: (alias: string) =>
        this.gsiList.find(gsi => gsi.alias === alias),
    };
  }
}
