import { getPG } from "../../db/postgres";
import { logger } from "../../utils/log-util";
import { computeAccountBalance } from "../biz-logic/accounts";
import { decimalToString } from "../../utils/decimal";

// SQL row types (with string fields for BigInt/Decimal)
type AccountRow = {
	id: string;
	balance_type: "DEBIT" | "CREDIT";
	ledger_id: number;
	external_id: string | null;
	currency_code: string;
	user_data: null | ALL;
	created_at: Date;
	updated_at: Date;
	minimum_balance: string;
	maximum_balance: string | null;
};

type TransferRow = {
	id: string;
	external_id: string | null;
	currency_code: string;
	debit_account_id: string;
	credit_account_id: string;
	amount: string;
	reference: string | null;
	created_at: Date;
	state: "PENDING" | "POSTED" | "VOIDED";
};

export async function getAccount(accountId: bigint) {
	const pg = getPG();
	const results = await pg<AccountRow[]>`
		SELECT 
			id,
			balance_type,
			ledger_id,
			external_id,
			currency_code,
			user_data,
			created_at,
			updated_at,
			minimum_balance,
			maximum_balance
		FROM accounts
		WHERE id = ${accountId}
	`;

	if (results.length === 0) return null;

	const account = results[0];
	const balance = await computeAccountBalance(accountId);
	if (balance instanceof Error) {
		logger.error(balance);
		return null;
	}
	return Object.assign(account, {
		balance: {
			balance_type: balance.balanceType,
			value: decimalToString(balance.value),
			minimum_balance: decimalToString(balance.minimumBalance),
			maximum_balance: balance.maximumBalance
				? decimalToString(balance.maximumBalance)
				: null,
		},
	});
}

export async function getTransfer(transferId: string) {
	const pg = getPG();
	const results = await pg<TransferRow[]>`
		SELECT 
			id,
			external_id,
			currency_code,
			debit_account_id,
			credit_account_id,
			amount,
			reference,
			created_at,
			state
		FROM transfers
		WHERE id = ${transferId}
	`;

	if (results.length === 0) return null;
	return (results[0]);
}

export async function listAccounts(skip: number, take: number) {
	const pg = getPG();
	const results = await pg<AccountRow[]>`
		SELECT 
			id,
			balance_type,
			ledger_id,
			external_id,
			currency_code,
			user_data,
			created_at,
			updated_at,
			minimum_balance,
			maximum_balance
		FROM accounts
		ORDER BY id ASC
		LIMIT ${take}
		OFFSET ${skip}
	`;

	return results;
}
