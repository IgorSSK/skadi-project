import { Entity, Table, zdynamo } from '@skadi/dynamo';
import { z } from 'zod';

async function main() {
  const SingleTable = Table.connect('dynamo_std_demo')
    .clientConfig({ region: 'us-east-1' })
    .gsis([
      {
        alias: 'byType',
        partitionKey: 'gsi1_pk',
        sortKey: 'gsi1_sk',
      },
      {
        alias: 'byStatus',
        partitionKey: 'gsi2_pk',
        sortKey: 'gsi2_sk',
      },
    ])
    .build();

  const UserEntity = Entity.define('User')
    .table(SingleTable)
    .schema({
      pk: zdynamo.partitionKey('USER#{userId}', { userId: z.string() }),
      sk: zdynamo.sortKey('PROFILE', {}),
      userId: z.string(),
      name: zdynamo.nonEmptyString(),
      email: z.string().email(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).default('PENDING'),
      organizationId: z.string(),
      role: z.enum(['ADMIN', 'USER', 'VIEWER']).default('USER'),
      createdAt: zdynamo.timestamp(),
      updatedAt: zdynamo.timestamp(),
    });

  const AccountEntity = Entity.define('Account')
    .table(SingleTable)
    .schema({
      pk: zdynamo.partitionKey('USER#{userId}', { userId: z.string() }),
      sk: zdynamo.sortKey('ACCOUNT#{accountId}', { accountId: z.string() }),
      userId: z.string(),
      accountId: z.string(),
      type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT']),
      title: zdynamo.nonEmptyString(),
      balance: zdynamo.positiveNumber().default(0),
      currency: zdynamo.currency(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'FROZEN']).default('ACTIVE'),
      createdAt: zdynamo.timestamp(),
      updatedAt: zdynamo.timestamp(),
    });

  const TransactionEntity = Entity.define('Transaction')
    .table(SingleTable)
    .schema({
      pk: zdynamo.partitionKey('ACCOUNT#{accountId}', {
        accountId: z.string(),
      }),
      sk: zdynamo.sortKey('TXN#{transactionId}', { transactionId: z.string() }),
      accountId: z.string(),
      transactionId: z.string(),
      amount: z.number(),
      type: z.enum(['DEBIT', 'CREDIT']),
      description: zdynamo.nonEmptyString(),
      status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).default('PENDING'),
      reference: z.string().optional(),
      createdAt: zdynamo.timestamp(),
      processedAt: z.date().optional(),
    });

  // 1. Criar usuário
  const user = await UserEntity.create()
    .item({
      pk: { userId: 'user-123' },
      sk: {},
      userId: 'user-123',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      status: 'ACTIVE',
      organizationId: 'org-456',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  console.log('Usuário criado:', user.userId, user.name);

  // 2. Buscar usuário
  const foundUser = await UserEntity.get()
    .key({ userId: 'user-123' })
    .execute();
  console.log('Usuário encontrado:', foundUser?.userId, foundUser?.name);

  // 3. Criar conta
  const account = await AccountEntity.create()
    .item({
      pk: { userId: 'user-123' },
      sk: { accountId: 'acc-789' },
      userId: 'user-123',
      accountId: 'acc-789',
      type: 'CHECKING',
      title: 'Conta Corrente Principal',
      balance: 1500.5,
      currency: 'BRL',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();
  console.log(
    'Conta criada:',
    account.accountId,
    account.title,
    account.balance
  );

  // 4. Atualizar conta
  const updatedAccount = await AccountEntity.update()
    .key({ userId: 'user-123', accountId: 'acc-789' })
    .set({ balance: 2000, updatedAt: new Date() })
    .execute();
  console.log(
    'Conta atualizada:',
    updatedAccount?.accountId,
    updatedAccount?.balance
  );

  // 5. Query contas do usuário
  const contas = await AccountEntity.query()
    .pk({ userId: 'user-123' })
    .sk('begins_with', 'ACCOUNT#')
    .execute();
  if (Array.isArray(contas.items) && contas.items.length > 0) {
    console.log(
      'Contas do usuário:',
      contas.items.map((c: any) => ({ id: c.accountId, saldo: c.balance }))
    );
  } else {
    console.log('Contas do usuário: Nenhuma encontrada');
  }

  // 6. Criar transação
  const txn = await TransactionEntity.create()
    .item({
      pk: { accountId: 'acc-789' },
      sk: { transactionId: 'txn-001' },
      accountId: 'acc-789',
      transactionId: 'txn-001',
      amount: -50.0,
      type: 'DEBIT',
      description: 'Compra no supermercado',
      status: 'COMPLETED',
      createdAt: new Date(),
    })
    .execute();
  console.log(
    'Transação criada:',
    txn.transactionId,
    txn.amount,
    txn.description
  );

  // 7. Query transações da conta
  const txns = await TransactionEntity.query()
    .pk({ accountId: 'acc-789' })
    .sk('begins_with', 'TXN#')
    .execute();
  if (Array.isArray(txns.items) && txns.items.length > 0) {
    console.log(
      'Transações da conta:',
      txns.items.map((t: any) => ({ id: t.transactionId, valor: t.amount }))
    );
  } else {
    console.log('Transações da conta: Nenhuma encontrada');
  }

  // 8. Query por índice (contas ativas via GSI)
  const contasAtivas = await AccountEntity.query()
    .index('byStatus')
    .pk({ status: 'ACTIVE' })
    .execute();
  if (Array.isArray(contasAtivas.items) && contasAtivas.items.length > 0) {
    console.log(
      'Contas ativas via GSI:',
      contasAtivas.items.map((c: any) => c.accountId)
    );
  } else {
    console.log('Contas ativas via GSI: Nenhuma encontrada');
  }

  // 9. Deletar conta
  await AccountEntity.delete()
    .key({ userId: 'user-123', accountId: 'acc-789' })
    .execute();
  console.log('Conta deletada: acc-789');
}

main().catch(console.error);
