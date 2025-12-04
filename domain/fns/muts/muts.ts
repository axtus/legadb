import { Prisma } from "@/prisma/generated/client";
import { prisma } from "../../../prisma/prisma-client";

export async function createAccount(input: {
	id: bigint;
	ledgerId: number;
	externalId?: string;
	currencyCode: string;
	balanceType: "CREDIT" | "DEBIT";
	minimumBalance: Prisma.Decimal;
	maximumBalance?: Prisma.Decimal | null;
}) {
	await prisma.account.create({
		data: {
			id: input.id,
			ledgerId: input.ledgerId,
			externalId: input.externalId,
			currencyCode: input.currencyCode,
			balanceType: input.balanceType,
			minimumBalance: input.minimumBalance,
			maximumBalance: input.maximumBalance ?? null,
		},
	});
}
