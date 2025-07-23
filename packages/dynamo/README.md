# Exemplo de uso com `@skadi/dynamo`

```typescript
import { Attribute, TableSchema, DynamoDocument } from '@skadi/dynamo';

// Defina o schema da tabela
const userSchema = new TableSchema({
  tableName: 'users',
  definition: {
    id: Attribute.string().primary(),
    email: Attribute.string().unique(),
    name: Attribute.string(),
    age: Attribute.number().optional(),
    createdAt: Attribute.date().default(() => new Date()),
  },
});

// Instancie o Document Mapper
const document = new DynamoDocument({
  schema: userSchema,
  region: 'us-east-1',
});

// Criar um novo usuário
const [_, putError] = await document.put({
  id: 'user-1',
  email: 'user1@email.com',
  name: 'Usuário 1',
});
if (putError) throw putError;

// Buscar usuário por chave primária
const [user, getError] = await document.get({ id: 'user-1' });
if (getError) throw getError;
console.log(user);

// Atualizar campos do usuário
const [__, updateError] = await document.update(
  { id: 'user-1' },
  { name: 'Novo Nome', age: 30 }
);
if (updateError) throw updateError;

// Remover usuário
const [___, deleteError] = await document.delete({ id: 'user-1' });
if (deleteError) throw deleteError;

// Consultar usuários (exemplo de query)
const [users, queryError] = await document.query({ email: 'user1@email.com' });
if (queryError) throw queryError;
console.log(users);
```

> **Nota:** Certifique-se de que a tabela DynamoDB existe e as credenciais AWS estejam configuradas corretamente no ambiente.
# @skadi/dynamo

Type-safe DynamoDB document mapper with schema-based operations for Node.js applications.

## Features

- 🔒 **Type Safety**: Full TypeScript support with schema-based type inference
- 🚀 **Modern**: Built with ES modules and latest TypeScript features
- 📝 **Schema Definition**: Declarative schema with automatic type generation
- ⚡ **Performance**: Optimized for modern Node.js environments
- 🛠️ **Developer Experience**: Comprehensive IntelliSense and error checking

## Installation

```bash
npm install @skadi/dynamo
# or
pnpm add @skadi/dynamo
# or
yarn add @skadi/dynamo
```

## Quick Start

```typescript
import { TableSchema, DynamoDocument } from '@skadi/dynamo';

// Define your table schema
const userSchema = TableSchema.create('users', {
  pk: TableSchema.pk<string>(), // Partition key
  sk: TableSchema.sk<string>(), // Sort key
  name: TableSchema.string(),
  email: TableSchema.string(),
  age: TableSchema.number(),
  createdAt: TableSchema.date(),
});

// Create document mapper
const document = new DynamoDocument({
  schema: userSchema,
  region: 'us-east-1',
});

// All operations are fully typed based on your schema
await document.put({
  pk: 'user#123',
  sk: 'profile',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: new Date(),
});

const [user, error] = await document.get({
  pk: 'user#123',
  sk: 'profile',
});
```

## API Reference

### TableSchema

Create and define your DynamoDB table schema with full type safety.

### DynamoDocument

Main class for performing CRUD operations with automatic type inference.

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0

## License

MIT
  tableName: 'users',
  partitionKey: 'id'
});

// Configure fields
DocumentConfig.field(User, 'email', {
  required: true,
  transform: {
    set: (value) => value.toLowerCase(),
  }
});

DocumentConfig.field(User, 'createdAt', {
  transform: {
    get: (value) => new Date(value),
    set: (value) => value.toISOString(),
  }
});
```

### Operações CRUD

```typescript
// Create
const user = new User({
  id: 'user-123',
  email: 'John.Doe@example.com',
  name: 'John Doe',
  createdAt: new Date(),
  updatedAt: new Date(),
});

await user.save();

// Read
const foundUser = await User.findByKey('user-123');

// Update
if (foundUser) {
  foundUser.name = 'John Smith';
  foundUser.updatedAt = new Date();
  await foundUser.save();
}

// Delete
if (foundUser) {
  await foundUser.delete();
}
```

### Query Builder

```typescript
import { QueryBuilder } from '@skadi/dynamo';

const queryBuilder = new QueryBuilder(client, 'users')
  .partitionKey('userId', 'user-123')
  .sortKeyBeginsWith('email#')
  .limit(10);

const results = await queryBuilder.execute();
```

### Schema Builder

```typescript
import { DocumentSchemaBuilder, StringField, DateField } from '@skadi/dynamo';

const userSchema = new DocumentSchemaBuilder()
  .addField('id', new StringField({ required: true }))
  .addField('email', new StringField({ 
    required: true,
    transform: (value) => value.toLowerCase()
  }))
  .addField('name', new StringField())
  .addField('createdAt', new DateField({ 
    defaultValue: () => new Date() 
  }))
  .build();
```

### Template Keys

```typescript
import { TemplateKeyField } from '@skadi/dynamo';

class UserProfile extends Document {
  userId: string;
  profileType: string;
  profileKey: string; // Generated from template
}

DocumentConfig.table(UserProfile, {
  tableName: 'user-profiles',
  partitionKey: 'userId',
  sortKey: 'profileKey'
});

DocumentConfig.field(UserProfile, 'profileKey', {
  template: 'profile#{profileType}#{userId}'
});
```

### Batch Operations

```typescript
import { BatchGetOperation, BatchWriteOperation } from '@skadi/dynamo';

// Batch get
const batchGet = new BatchGetOperation(client);
const results = await batchGet.execute({
  RequestItems: {
    'users': {
      Keys: [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' }
      ]
    }
  }
});

// Batch write
const batchWrite = new BatchWriteOperation(client);
await batchWrite.execute({
  RequestItems: {
    'users': [
      {
        PutRequest: {
          Item: { id: 'user-4', name: 'User Four' }
        }
      },
      {
        DeleteRequest: {
          Key: { id: 'user-5' }
        }
      }
    ]
  }
});
```

### Factory Pattern

```typescript
import { createDocumentClass } from '@skadi/dynamo';

interface UserData {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

const User = createDocumentClass<UserData>('User', {
  tableName: 'users',
  partitionKey: 'id'
}, {
  email: {
    required: true,
    transform: {
      set: (value) => value.toLowerCase()
    }
  },
  createdAt: {
    transform: {
      get: (value) => new Date(value),
      set: (value) => value.toISOString()
    }
  }
});

const user = User.create({
  id: 'user-123',
  email: 'user@example.com',
  name: 'User Name',
  createdAt: new Date()
});

await user.save();
```

## API Reference

### Document

Base class para documentos DynamoDB com métodos CRUD.

#### Métodos de Instância

- `save(): Promise<this>` - Salva o documento
- `delete(): Promise<void>` - Deleta o documento
- `reload(): Promise<this>` - Recarrega do banco
- `isModified(fieldName?: string): boolean` - Verifica modificações
- `getModifiedFields(): string[]` - Lista campos modificados
- `toJSON(): Record<string, unknown>` - Converte para objeto

#### Métodos Estáticos

- `create<T>(data: Record<string, unknown>): T` - Cria nova instância
- `findByKey<T>(pk: unknown, sk?: unknown): Promise<T | null>` - Busca por chave

### DocumentConfig

Utilitário para configurar metadados de documentos.

- `table(target, options)` - Configura tabela
- `field(target, propertyKey, options)` - Configura campo
- `partitionKey(target, propertyKey, attributeName?)` - Configura partition key
- `sortKey(target, propertyKey, attributeName?)` - Configura sort key

### Query Builders

#### QueryBuilder

- `partitionKey(key, value)` - Define partition key
- `sortKey(key, value)` - Define sort key exato
- `sortKeyBeginsWith(key, prefix)` - Sort key começa com
- `sortKeyBetween(key, start, end)` - Sort key entre valores
- `filter(expression)` - Adiciona filtro
- `limit(count)` - Limita resultados
- `scanIndexForward(forward)` - Ordem dos resultados
- `execute()` - Executa query

#### ScanBuilder

- `filter(expression)` - Adiciona filtro
- `limit(count)` - Limita resultados
- `segment(segment, totalSegments)` - Scan paralelo
- `execute()` - Executa scan

## Contribuição

1. Fork o projeto
2. Crie uma feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

MIT
