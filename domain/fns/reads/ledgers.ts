import { getPG } from "../../db/postgres";

type LedgerRow = {
	id: number;
	name: string;
	created_at: Date;
};

export async function getLedger(id: number) {
	const pg = getPG();
	const results = await pg<LedgerRow[]>`
		SELECT 
			id,
			name,
			created_at
		FROM ledgers
		WHERE id = ${id}
	`;

	if (results.length === 0) return null;
	return results[0];
}

export async function listLedgers(skip: number, take: number) {
	const pg = getPG();
	const results = await pg<LedgerRow[]>`
		SELECT 
			id,
			name,
			created_at
		FROM ledgers
		ORDER BY id ASC
		LIMIT ${take}
		OFFSET ${skip}
	`;

	return results;
}
