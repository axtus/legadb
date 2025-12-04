import { getPG } from "../../db/postgres";

type CurrencyRow = {
	code: string;
	name: string;
	symbol: string;
	minor_units: number;
};

export async function getCurrency(code: string) {
	const pg = getPG();
	const results = await pg<CurrencyRow[]>`
		SELECT 
			code,
			name,
			symbol,
			minor_units
		FROM currencies
		WHERE code = ${code}
	`;

	if (results.length === 0) return null;
	return results[0];
}

export async function listCurrencies(skip: number, take: number) {
	const pg = getPG();
	const results = await pg<CurrencyRow[]>`
		SELECT 
			code,
			name,
			symbol,
			minor_units
		FROM currencies
		ORDER BY code ASC
		LIMIT ${take}
		OFFSET ${skip}
	`;

	return results;
}

export async function getCurrencyUsage(code: string) {
	const pg = getPG();
	const results = await pg<{ count: string }[]>`
		SELECT COUNT(*) as count
		FROM accounts
		WHERE currency_code = ${code}
	`;

	return Number(results[0]?.count ?? 0);
}
