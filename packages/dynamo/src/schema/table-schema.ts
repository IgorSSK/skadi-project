/**
 * TableSchema - Definição de schema para tabelas DynamoDB
 */

import { Attribute } from './attribute.js';
import { TemplateKey } from './template-key.js';

export type TableSchemaDefinition<T> = {
  [K in keyof T]: Attribute<T[K]> | TemplateKey<T[K]>;
};

export class TableSchema<T> {
  public name: string;
  public definition: TableSchemaDefinition<T>;

  private constructor(name: string, definition: TableSchemaDefinition<T>) {
    this.name = name;
    this.definition = definition;
  }

  static create<T>(
    name: string,
    definition: TableSchemaDefinition<T>
  ): TableSchema<T> {
    return new TableSchema<T>(name, definition);
  }

  // Métodos helpers para schema
  static pk<T = string>(attrName?: string): TemplateKey<T> {
    return new TemplateKey<T>(attrName ?? 'pk');
  }
  static sk<T = string>(attrName?: string): TemplateKey<T> {
    return new TemplateKey<T>(attrName ?? 'sk');
  }
  static string(attrName?: string): Attribute<string> {
    return new Attribute<string>(attrName);
  }
  static number(attrName?: string): Attribute<number> {
    return new Attribute<number>(attrName);
  }
  static date(attrName?: string): Attribute<Date> {
    return new Attribute<Date>(
      attrName,
      (value: unknown) => new Date(value as string)
    );
  }
}
