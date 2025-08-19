# @skadhi/dynamo - Demonstração Single Table Design

Demonstração completa do @skadhi/dynamo ODM implementando o padrão **Single Table Design** para DynamoDB.

## 🏗️ Sobre a Demonstração

Esta demonstração implementa um sistema financeiro simples usando uma única tabela DynamoDB (`dynamo_std_demo`) com múltiplas entidades:

- **👤 User**: Perfis de usuários
- **🏦 Account**: Contas financeiras dos usuários  
- **💸 Transaction**: Transações das contas

### Estrutura da Tabela
```
Tabela: dynamo_std_demo
- Partition Key: pk
- Sort Key: sk
- GSI1: gsi1_pk + gsi1_sk (consultas por tipo)
- GSI2: gsi2_pk + gsi2_sk (consultas por status)
```

### Padrões de Chave
```
👤 User:        pk="USER#user-123"       sk="PROFILE"
🏦 Account:     pk="USER#user-123"       sk="ACCOUNT#acc-789"  
💸 Transaction: pk="ACCOUNT#acc-789"     sk="TXN#txn-001"
```

## 🚀 Como Executar

### Desenvolvimento (recomendado)
```bash
pnpm dev
```

### Build e execução
```bash
pnpm build
pnpm start
```

### Execução direta
```bash
pnpm demo
```

## 🔧 Funcionalidades Demonstradas

### ✅ CRUD Completo
- **create()** - Criação de registros
- **get()** - Busca por chave primária
- **query()** - Consultas com filtros
- **update()** - Atualizações
- **delete()** - Remoção

### ✅ Operações Avançadas
- **batchGet()** - Busca em lote
- **transaction()** - Operações atômicas
- **index()** - Consultas em GSI
- **filter()** - Filtros personalizados
- **limit()** - Controle de paginação

### ✅ Padrões de Acesso
- Buscar usuário específico
- Listar contas de um usuário
- Listar transações de uma conta
- Filtrar por status usando GSI
- Operações atômicas entre entidades

## 🎯 Exemplo de Uso

```typescript
import { Entity, Table, zdynamo } from '@skadhi/dynamo';

// Conectar à tabela
const table = Table.connect('dynamo_std_demo')
  .region('us-east-1')
  .build();

// Definir entidade
const UserEntity = Entity.define('User')
  .table(table)
  .schema({
    pk: zdynamo.partitionKey('USER#{userId}', { userId: z.string() }),
    sk: zdynamo.sortKey('PROFILE', {}),
    name: zdynamo.nonEmptyString(),
    email: z.string().email(),
    // ... outros campos
  });

// Usar a entidade
const user = await UserEntity.create()
  .item({ userId: 'user-123', name: 'João Silva' })
  .exec();
```

## 📚 Recursos

- **Type Safety**: Validação completa com TypeScript e Zod
- **Performance**: Single Table Design otimizado
- **Flexibilidade**: GSIs para diferentes padrões de consulta
- **Simplicidade**: API fluente e intuitiva

## 🎉 Resultado

A demonstração executa sem erros e mostra todas as funcionalidades do @skadhi/dynamo ODM em ação, servindo como base completa para implementações em produção.

## 📁 Example File

### `comprehensive-demo.ts` - Complete API Demonstration
**Purpose**: Unified example showing all features and usage patterns  
**Run**: `pnpm demo` or `pnpm dev`

This comprehensive demonstration includes:
- **Features Overview**: Complete list of all capabilities
- **Table Connection**: Advanced configuration with multiple GSIs  
- **Entity Definition**: Complex schema with all zdynamo helpers
- **Basic CRUD**: Create, Read, Update, Delete operations
- **Batch Operations**: Batch create and get operations
- **Query Patterns**: Main table and GSI queries with filtering
- **Scan Operations**: Full table scans with filters
- **Analytics**: Aggregations and calculations
- **Transactions**: Atomic multi-item operations
- **Working Demo**: Integration with actual working implementation
- **Utilities**: Helper functions and test data generation

## 🚀 Running the Example

```bash
# Navigate to examples directory
cd apps/example

# Install dependencies
pnpm install

# Run the comprehensive demo
pnpm demo

# Or use dev command
pnpm dev
```

## 📚 Key Concepts Demonstrated

### 1. Table Connection with Advanced Configuration
```typescript
const AppTable = Table.connect('fehu_tb_workspaces')
  .region('us-east-1')
  .transform({
    caseStyle: 'snake_case',
    timestamps: true,
  })
  .globalSecondaryIndexes([
    {
      alias: 'byWorkspace',
      partitionKey: 'gsi_1_pk',
      sortKey: 'gsi_1_sk',
      projectionType: 'ALL',
    },
    // ... more GSIs
  ])
  .build();
```

### 2. Comprehensive Entity Schema
```typescript
const AccountEntity = Entity.define('Account')
  .table(AppTable)
  .schema({
    // Primary keys with templates
    pk: zdynamo.partitionKey('USER#{userId}', {
      userId: zdynamo.uuid(),
    }),
    sk: zdynamo.sortKey('ACCOUNT#{accountId}', {
      accountId: zdynamo.uuid(),
    }),
    
    // Business attributes with validation
    type: zdynamo.enumWithDefault(['CHECKING', 'SAVINGS', 'CREDIT'] as const, 'CHECKING'),
    title: zdynamo.nonEmptyString(),
    balance: zdynamo.positiveNumber(),
    currency: zdynamo.currency(),
    
    // GSI keys for different access patterns
    gsi_1_pk: zdynamo.gsiPartitionKey('WORKSPACE#{workspaceId}', {
      workspaceId: zdynamo.uuid(),
    }),
    // ... more GSI keys
  });
```

### 3. Complete CRUD Operations
```typescript
// Create with complex data
const account = await AccountEntity.create()
  .item({ /* full object */ })
  .ifNotExists()
  .exec();

// Query with filters
const accounts = await AccountEntity.query()
  .pk({ userId: 'user-123' })
  .sk('begins_with', 'ACCOUNT#')
  .filter('isActive', '=', true)
  .filter('balance', '>', 1000)
  .sortBy('DESC')
  .limit(10)
  .exec();

// Complex updates
const updated = await AccountEntity.update()
  .key({ userId: 'user-123', accountId: 'acc-456' })
  .set({ title: 'New Title' })
  .add('balance', 500.0)
  .condition('attribute_exists(pk)')
  .returnValues('ALL_NEW')
  .exec();
```

### 4. Advanced Features
- **Batch Operations**: Create and retrieve multiple items efficiently
- **GSI Queries**: Query across different access patterns
- **Transactions**: Atomic operations across multiple items
- **Analytics**: Built-in aggregation and calculation patterns
- **Type Safety**: Full TypeScript integration with runtime validation

## 🛠️ Development Notes

- **Current Status**: Comprehensive API design with working core features
- **Working Features**: Basic CRUD, queries, schema validation
- **Demonstrated Concepts**: All planned features with working examples
- **Build Status**: ✅ Package builds successfully

## 📖 Documentation

This example serves as both a demonstration and documentation of the complete API surface. For additional details, see:

- [Main Dynamo Package](../../packages/dynamo/)
- [API Documentation](../../packages/dynamo/README.md)
- [Test Suite](../../packages/dynamo/tests/)

## 🔗 Usage in Your Projects

Once the package is published, you can use it like this:

```typescript
import { Entity, Table, zdynamo } from '@skadhi/dynamo';

// Your implementation here...
```

For now, the example demonstrates the planned API structure and working implementation patterns.
