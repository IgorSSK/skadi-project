# @skadi/dynamo

A type-safe, schema-first DynamoDB ODM (Object Document Mapper) for TypeScript, designed specifically for Single Table Design patterns.

## Features

- 🔒 **Full Type Safety** - Complete TypeScript support with schema validation using Zod
- 🏗️ **Single Table Design** - Native support for DynamoDB Single Table Design patterns
- 🔍 **Schema Validation** - Runtime validation with Zod schemas
- ⚡ **Performance Optimized** - Built for AWS DynamoDB best practices
- 🛠️ **Fluent API** - Intuitive, chainable API for all operations
- 🎯 **GSI Support** - First-class Global Secondary Index support
- 🔄 **ACID Transactions** - Type-safe transaction support
- 📄 **Pagination** - Built-in cursor-based pagination
- 🎛️ **Condition Expressions** - Type-safe condition and filter expressions

## Installation

```bash
# pnpm (recommended)
pnpm add @skadi/dynamo zod

# npm
npm install @skadi/dynamo zod

# yarn
yarn add @skadi/dynamo zod
```

## Quick Start

### 1. Connect to Existing Table

```typescript
import { Table, Entity, zdynamo } from '@skadi/dynamo';

// Connect to existing DynamoDB table
const AppTable = Table
  .connect('my-dynamodb-table')
  .region('us-east-1')
  .globalSecondaryIndexes([
    {
      alias: 'byStatus',
      partitionKey: 'gsi_1_pk',
      sortKey: 'gsi_1_sk',
      projectionType: 'ALL'
    }
  ])
  .build();
```

### 2. Define Entity Schema

```typescript
import { z } from 'zod';

const UserEntity = Entity
  .define('User')
  .table(AppTable)
  .schema({
    // Required partition key
    pk: zdynamo.partitionKey('USER#{userId}', {
      userId: zdynamo.uuid()
    }),
    
    // Required sort key (if defined)
    sk: zdynamo.sortKey('PROFILE#{userId}', {
      userId: zdynamo.uuid()
    }),
    
    // Entity fields with validation
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(18).max(120),
    isActive: z.boolean().default(true),
    
    // GSI keys
    gsi_1_pk: zdynamo.gsiPartitionKey('STATUS#{isActive}', {
      isActive: z.boolean()
    }),
    gsi_1_sk: zdynamo.timestamp(),
    
    // Automatic timestamps
    createdAt: zdynamo.timestamp(),
    updatedAt: zdynamo.timestamp()
  });
```

### 3. CRUD Operations

```typescript
// CREATE
const user = await UserEntity
  .create()
  .item({
    pk: { userId: 'user-123' },
    sk: { userId: 'user-123' },
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    gsi_1_pk: { isActive: true },
    gsi_1_sk: new Date()
  })
  .ifNotExists()
  .execute();

// READ
const user = await UserEntity
  .get()
  .key({ userId: 'user-123' })
  .execute();

// QUERY
const activeUsers = await UserEntity
  .query()
  .index('byStatus')
  .pk({ isActive: true })
  .limit(50)
  .execute();

// UPDATE
const updatedUser = await UserEntity
  .update()
  .key({ userId: 'user-123' })
  .set({ name: 'Jane Doe', age: 31 })
  .condition('attribute_exists(pk)')
  .returnValues('ALL_NEW')
  .execute();

// DELETE
await UserEntity
  .delete()
  .key({ userId: 'user-123' })
  .condition('attribute_exists(pk)')
  .execute();
```

## Advanced Usage

### Complex Schema Validation

```typescript
const AccountEntity = Entity
  .define('Account')
  .table(AppTable)
  .schema({
    pk: zdynamo.partitionKey('USER#{userId}', {
      userId: zdynamo.uuid()
    }),
    sk: zdynamo.sortKey('ACCOUNT#{accountId}', {
      accountId: zdynamo.uuid()
    }),
    
    type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT']),
    balance: z.number().default(0),
    
    // Nested object validation
    settings: z.object({
      notifications: z.boolean().default(true),
      overdraftLimit: z.number().min(0).optional(),
      autoPayments: z.array(z.object({
        payeeId: z.string().uuid(),
        amount: z.number().positive(),
        frequency: z.enum(['WEEKLY', 'MONTHLY'])
      })).default([])
    }).optional(),
    
    // Array validation
    tags: z.array(z.string()).default([]),
    
    // Custom validation
    accountNumber: z.string().regex(/^\d{10,12}$/, 'Invalid account number'),
    
    // GSI keys for workspace queries
    gsi_1_pk: zdynamo.gsiPartitionKey('WORKSPACE#{workspaceId}', {
      workspaceId: zdynamo.uuid()
    }),
    gsi_1_sk: zdynamo.gsiSortKey('ACCOUNT#{type}#{createdAt}', {
      type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT']),
      createdAt: z.date()
    })
  });
```

## API Reference

### Schema Helpers (zdynamo)

#### Key Templates
```typescript
zdynamo.partitionKey(template: string, params: ZodSchema)
zdynamo.sortKey(template: string, params: ZodSchema)
zdynamo.gsiPartitionKey(template: string, params: ZodSchema)
zdynamo.gsiSortKey(template: string, params: ZodSchema)
```

#### Common Types
```typescript
zdynamo.uuid()                    // UUID validation
zdynamo.timestamp()               // Date with default now
zdynamo.currency()                // 3-letter currency code
zdynamo.entityType(type: string)  // Literal with default
zdynamo.nonEmptyString()          // String with min length 1
zdynamo.positiveNumber()          // Number > 0
zdynamo.email()                   // Email validation
zdynamo.url()                     // URL validation
```

### Table Connection
```typescript
Table.connect(tableName: string)
  .region(region: string)
  .client(client: DynamoDBDocumentClient)
  .transform({ caseStyle: 'snake_case', timestamps: boolean })
  .globalSecondaryIndexes(indexes: GSIDefinition[])
  .build()
```

### Entity Definition
```typescript
Entity.define(name: string)
  .table(table: ConnectedTable)
  .schema(schema: EntitySchemaDefinition)
```

## Error Handling

```typescript
import { 
  EntityValidationError,
  MissingKeyError,
  DynamoOperationError,
  isSkadiDynamoError
} from '@skadi/dynamo';

try {
  await UserEntity.create().item(invalidData).execute();
} catch (error) {
  if (isSkadiDynamoError(error)) {
    switch (error.code) {
      case 'ENTITY_VALIDATION_ERROR':
        // Handle validation errors
        break;
      case 'MISSING_KEY_ERROR':
        // Handle missing key errors  
        break;
      default:
        // Handle other Skadi errors
    }
  }
}
```

## Best Practices

### 1. Schema Design
- Use descriptive entity types
- Include all GSI keys in your schema
- Validate all business rules with Zod
- Use templates for consistent key formats

### 2. Query Patterns
- Design GSIs for your access patterns
- Use meaningful aliases for GSIs
- Implement proper pagination
- Add appropriate filters to reduce data transfer

### 3. Type Safety
- Export and reuse type definitions
- Use the automatically inferred types
- Validate input at service boundaries
- Handle errors appropriately

## Examples

See the complete [example implementation](src/example.ts) for a full-featured account management system demonstrating all features of the library.

## License

MIT © Skadi Team
