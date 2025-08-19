import { Entity, EntityValidationError, SkadiDynamoError, Table, zdynamo } from "@skadhi/dynamo";
import { z } from "zod";

async function main() {
	const SingleTable = Table.connect("dynamo_std_demo", "us-east-1")
		.options({ caseStyle: "snakeCase" })
		.gsis([
			{
				alias: "byType",
				indexName: "gsi_1_demo",
				partitionKey: "gsi_1_pk",
				sortKey: "gsi_1_sk",
			},
		])
		.build();

	const UserEntity = Entity.define("User")
		.table(SingleTable)
		.schema({
			pk: zdynamo.partitionKey("USER#{userId}", { userId: z.string() }),
			sk: zdynamo.sortKey("PROFILE", {}),
			userId: z.string(),
			name: zdynamo.nonEmptyString(),
			email: z.string().email(),
			status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).default("PENDING"),
			organizationId: z.string(),
			role: z.enum(["ADMIN", "USER", "VIEWER"]).default("USER"),
			createdAt: zdynamo.timestamp(),
			updatedAt: zdynamo.timestamp(),
		});

	const AccountEntity = Entity.define("Account")
		.table(SingleTable)
		.schema({
			pk: zdynamo.partitionKey("USER#{userId}", { userId: z.string() }),
			sk: zdynamo.sortKey("ACCOUNT#{accountId}", { accountId: z.string() }),
			userId: z.string(),
			accountId: z.string(),
			type: z.enum(["CHECKING", "SAVINGS", "CREDIT"]),
			title: zdynamo.nonEmptyString(),
			balance: zdynamo.positiveNumber().default(0),
			currency: zdynamo.currency(),
			status: z.enum(["ACTIVE", "INACTIVE", "FROZEN"]).default("ACTIVE"),
			gsi1Pk: zdynamo.gsiPartitionKey("TYPE#{type}", {
				type: z.enum(["CHECKING", "SAVINGS", "CREDIT"]),
			}),
			gsi1Sk: zdynamo.gsiSortKey("{createdAt}", { createdAt: z.date() }),
			gsi2Pk: zdynamo.gsiPartitionKey("STATUS#{status}", {
				status: z.enum(["ACTIVE", "INACTIVE", "FROZEN"]),
			}),
			gsi2Sk: zdynamo.gsiSortKey("{createdAt}", { createdAt: z.date() }),
			createdAt: zdynamo.timestamp(),
			updatedAt: zdynamo.timestamp(),
		});

	console.log("--- Iniciando demonstração do Skadi Dynamo ODM ---");

	// 1. Criar usuário
	console.log("\n1. Criando usuário...");
	const [user, createUserError] = await UserEntity.create()
		.item({
			pk: { userId: "user-123" },
			sk: {},
			userId: "user-123",
			name: "João Silva",
			email: "joao.silva@example.com",
			status: "ACTIVE",
			organizationId: "org-456",
			role: "USER",
		})
		.exec();

	if (createUserError) {
		console.error("Erro ao criar usuário:", createUserError);
		if (createUserError instanceof EntityValidationError) {
			console.error("Detalhes da validação:", createUserError);
		}
		return;
	}
	if (!user) {
		console.error("Usuário não foi criado, mas não houve erro.");
		return;
	}
	console.log("Usuário criado:", user.userId, user.name);

	// 2. Buscar usuário
	console.log("\n2. Buscando usuário...");
	// @ts-expect-error - Type intersection issue with entities that have both pk and sk
	const [foundUser, getUserError] = await UserEntity.get().key({ userId: "user-123" }).exec();

	if (getUserError) {
		console.error("Erro ao buscar usuário:", getUserError);
		return;
	}
	console.log("Usuário encontrado:", foundUser?.userId, foundUser?.name);

	// 3. Criar conta
	console.log("\n3. Criando conta...");
	const [account, createAccountError] = await AccountEntity.create()
		.item({
			pk: { userId: "user-123" },
			sk: { accountId: "acc-789" },
			userId: "user-123",
			accountId: "acc-789",
			type: "CHECKING",
			title: "Conta Corrente Principal",
			balance: 1500.5,
			currency: "BRL",
			status: "ACTIVE",
			gsi1Pk: { type: "CHECKING" },
			gsi1Sk: { createdAt: new Date() },
			gsi2Pk: { status: "ACTIVE" },
			gsi2Sk: { createdAt: new Date() },
		})
		.exec();

	if (createAccountError) {
		console.error("Erro ao criar conta:", createAccountError);
		return;
	}
	if (!account) {
		console.error("Conta não foi criada, mas não houve erro.");
		return;
	}
	console.log("Conta criada:", account.accountId, account.title, account.balance);

	// 4. Atualizar conta
	console.log("\n4. Atualizando conta...");
	const [updatedAccount, updateAccountError] = await AccountEntity.update()
		.key({ userId: "user-123", accountId: "acc-789" })
		.set({ balance: 2000, status: "ACTIVE" })
		.exec();

	if (updateAccountError) {
		console.error("Erro ao atualizar conta:", JSON.stringify(updateAccountError));
		return;
	}
	console.log("Conta atualizada:", updatedAccount?.accountId, updatedAccount?.balance);

	// 5. Query de contas do usuário (sem GSI)
	console.log("\n5. Consultando contas do usuário (Query sem GSI)...");
	const [contas, queryError] = await AccountEntity.query()
		.pk({ userId: "user-123" })
		.sk("begins_with", "ACCOUNT#")
		.exec();

	if (queryError) {
		console.error("Erro ao consultar contas:", queryError);
		return;
	}

	if (contas && contas.items.length > 0) {
		console.log(
			"Contas do usuário:",
			contas.items.map((c) => ({ id: c.accountId, saldo: c.balance })),
		);
	} else {
		console.log("Contas do usuário: Nenhuma encontrada");
	}

	// 6. Query por índice (contas ativas via GSI)
	console.log("\n6. Consultando contas ativas (Query com GSI)...");
	const [contasAtivas, gsiQueryError] = await AccountEntity.query().index("byType").pk({ type: "CHECKING" }).exec();

	if (gsiQueryError) {
		console.error("Erro ao consultar contas ativas via GSI:", gsiQueryError);
		return;
	}

	if (contasAtivas && contasAtivas.items.length > 0) {
		console.log(
			"Contas ativas via GSI:",
			contasAtivas.items.map((c) => c.accountId),
		);
	} else {
		console.log("Contas ativas via GSI: Nenhuma encontrada");
	}

	// 7. Deletar conta
	console.log("\n7. Deletando conta...");
	const [, deleteError] = await AccountEntity.delete().key({ userId: "user-123", accountId: "acc-789" }).exec();

	if (deleteError) {
		console.error("Erro ao deletar conta:", deleteError);
		return;
	}
	console.log("Conta deletada com sucesso: acc-789");

	// 8. Verificar se a conta foi deletada
	console.log("\n8. Verificando se a conta foi deletada...");
	const [deletedAccount, getDeletedError] = await AccountEntity.get()
		.key({ userId: "user-123", accountId: "acc-789" })
		.exec();

	if (getDeletedError) {
		console.error("Erro ao verificar conta deletada:", getDeletedError);
		return;
	}

	if (deletedAccount === null) {
		console.log("Verificação bem-sucedida: a conta não foi encontrada.");
	} else {
		console.error("Falha na verificação: a conta ainda existe.");
	}

	console.log("\n--- Demonstração concluída ---");
}

main().catch((error) => {
	if (error instanceof SkadiDynamoError) {
		console.error(`Erro de Skadi Dynamo [${error.code}]:`, error.message);
	} else {
		console.error("Ocorreu um erro inesperado:", error);
	}
});
