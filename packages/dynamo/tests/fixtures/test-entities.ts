import { z } from 'zod';
import { Entity, zdynamo } from '../../src/index.js';
import { MockTable } from './mock-table.js';

export const AccountEntity = Entity.define('Account')
  .table(MockTable)
  .schema({
    pk: zdynamo.partitionKey('USER#{userId}', { userId: z.string() }),
    sk: zdynamo.sortKey('ACCOUNT#{accountId}', { accountId: z.string() }),
    type: z.enum(['CHECKING', 'SAVINGS']),
    title: z.string(),
    balance: z.number().default(0),
    gsi_1_pk: zdynamo.gsiPartitionKey('WORKSPACE#{workspaceId}', {
      workspaceId: z.string(),
    }),
    gsi_1_sk: zdynamo.timestamp(),
  });
