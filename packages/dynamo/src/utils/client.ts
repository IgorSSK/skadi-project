import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { TableConfig } from '../types.js';

export function createDocumentClient(
  config: TableConfig
): DynamoDBDocumentClient {
  if (config.client) {
    if (config.client instanceof DynamoDBDocumentClient) {
      return config.client;
    }
    return DynamoDBDocumentClient.from(config.client);
  }

  const dynamoClient = new DynamoDBClient({
    region: config.region || 'us-east-1',
  });

  return DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
      convertEmptyValues: false,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}
