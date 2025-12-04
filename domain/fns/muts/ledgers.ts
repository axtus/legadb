import { prisma } from "../../../prisma/prisma-client";

export async function createLedger(input: { id: number; name: string }) {
	await prisma.ledger.create({ data: input });
}
