/**
 * Attribute - Tipo base para atributos de schema
 */
export class Attribute<T> {
  public attrName?: string;
  public transform?: (value: unknown) => T;

  constructor(attrName?: string, transform?: (value: unknown) => T) {
    this.attrName = attrName;
    this.transform = transform;
  }
}
