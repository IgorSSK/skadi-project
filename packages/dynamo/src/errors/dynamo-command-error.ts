/**
 * Erro customizado para comandos DynamoDB
 */
export class DynamoCommandError extends Error {
	public readonly original: unknown;
	constructor(message: string, original: unknown) {
		super(message);
		this.name = "DynamoCommandError";
		this.original = original;
	}
}
