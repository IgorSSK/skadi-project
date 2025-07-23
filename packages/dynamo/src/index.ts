// Core classes and interfaces
export {
  DynamoDocument,
  type DynamoDocumentOptions,
} from './core/dynamo-document.js';
export { TableSchema, TableSchemaLegacy } from './core/table-schema.js';

// Enhanced attribute system
export {
  AttributeFactory,
  AbstractAttribute,
  StandardAttributeImpl,
  PrimaryKeyAttributeImpl,
} from './attributes/index.js';

// Type definitions
export type {
  BaseAttribute,
  PrimaryKeyAttribute,
  StandardAttribute,
  Attribute,
  SchemaDefinition,
  TableConfiguration,
  ExtractPrimaryKeys,
  ExtractAllKeys,
  UpdateExpression,
  QueryOptions,
  CommandResult,
  BatchOperation,
  ErrorContext,
} from './types/index.js';

// Enhanced error system
export {
  DynamoError,
  DynamoCommandError,
  DynamoValidationError,
  DynamoConfigurationError,
  DynamoConnectionError,
} from './errors/index.js';

// Client factory
export {
  DynamoClientFactory,
  defaultClientFactory,
  createDocumentClient,
  createClient,
  type DynamoClientConfig,
} from './core/client-factory.js';

// Command builders
export { GetCommand, GetCommandBuilder } from './builders/get-command.js';
export { PutCommand, PutCommandBuilder } from './builders/put-command.js';

// Command interfaces
export type {
  ICommand,
  IConditionalCommand,
  IProjectionCommand,
  IPaginatedCommand,
  ICommandBuilder,
  IClientFactory,
  CommandOptions,
  CommandResultWithMetadata,
  BatchOperationRequest,
  TransactionRequest,
} from './core/commands.js';

// Legacy utilities (deprecated but maintained for compatibility)
export * from './utils/index.js';
