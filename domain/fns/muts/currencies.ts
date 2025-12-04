import { prisma } from "../../../prisma/prisma-client";
import { CURRENCY_ARRAY } from "../../utils/currencies";

export async function createCurrency(input: {
	code: string;
	name: string;
	symbol: string;
	minorUnits: number;
}) {
	await prisma.currency.create({ data: input });
}

export async function updateCurrency(
	code: string,
	input: { name?: string; symbol?: string },
) {
	await prisma.currency.update({
		where: { code },
		data: input,
	});
}

export async function deleteCurrency(code: string) {
	await prisma.currency.delete({ where: { code } });
}

export async function importCurrencies(codes: string[]) {
	const currenciesToImport = CURRENCY_ARRAY.filter((c) =>
		codes.includes(c.code)
	).map((c) => ({
		code: c.code,
		name: c.name,
		symbol: c.symbol,
		minorUnits: c.minorUnits,
	}));

	if (currenciesToImport.length === 0) {
		return { imported: 0 };
	}

	await prisma.currency.createMany({
		data: currenciesToImport,
		skipDuplicates: true,
	});

	return { imported: currenciesToImport.length };
}
