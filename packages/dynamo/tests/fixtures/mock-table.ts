import { Table } from '../../src/index.js';

export const MockTable = Table.connect('mock-table')
  .options({
    clientConfig: {
      region: 'us-east-1',
    },
  })
  .gsis([
    {
      alias: 'byWorkspace',
      partitionKey: 'gsi_1_pk',
      sortKey: 'gsi_1_sk',
      projectionType: 'ALL',
    },
  ])
  .build();
