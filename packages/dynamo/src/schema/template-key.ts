/**
 * TemplateKey - Chave dinâmica baseada em template
 */
export class TemplateKey<_T> {
  public attrName: string;
  public template?: string;

  constructor(attrName: string, template?: string) {
    this.attrName = attrName;
    this.template = template;
  }
  // Métodos para extrair e gerar valores do template
}
