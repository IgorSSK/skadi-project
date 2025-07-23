import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { GSIDefinition } from '../types.js';

export interface ConnectedTable {
  tableName: string;
  documentClient: DynamoDBDocumentClient;
  gsis: GSIDefinition[];
  getIndexByAlias(alias: string): GSIDefinition | undefined;
}

export class Table {
  private _tableName?: string;
  private _documentClient?: DynamoDBDocumentClient;
  private _clientConfig?: DynamoDBClientConfig;
  private _gsis: GSIDefinition[] = [];

  /** Set the table name */
  public static connect(tableName: string) {
    const t = new Table();
    t._tableName = tableName;
    return t;
  }

  /** Optionally set a custom DynamoDBDocumentClient */
  public documentClient(client: DynamoDBDocumentClient) {
    this._documentClient = client;
    return this;
  }

  /** Optionally set a custom DynamoDBClientConfig */
  public clientConfig(config: DynamoDBClientConfig) {
    this._clientConfig = config;
    return this;
  }

  /** Optionally set GSIs */
  public gsis(gsis: GSIDefinition[]) {
    this._gsis = gsis;
    return this;
  }

  /**
   * Builds the final, immutable ConnectedTable object.
   * If no region or client has been configured, it will create a default DynamoDB client.
   */
  public build(): ConnectedTable {
    if (!this._tableName) {
      throw new Error(
        'Table name is required. Use Table.connect(tableName) to set it.'
      );
    }

    if (!this._documentClient) {
      this._documentClient = DynamoDBDocumentClient.from(
        new DynamoDBClient(this._clientConfig ?? {})
      );
    }

    return {
      tableName: this._tableName,
      documentClient: this._documentClient,
      gsis: this._gsis,
      getIndexByAlias(alias: string) {
        return this.gsis.find(gsi => gsi.alias === alias);
      },
    };
  }
}
