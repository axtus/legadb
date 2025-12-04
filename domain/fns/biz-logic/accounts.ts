import { KnownError } from "../../utils/errors";
import { assertNotNull } from "@/domain/utils/assertion-fns";
import { getPG } from "@/domain/db/postgres";
import { Prisma } from "@/prisma/generated/client";

type AccountWithBalance = {
	total: string | null;
	balance_type: "DEBIT" | "CREDIT";
	minimum_balance: string;
	maximum_balance: string | null;
};

/**
 * Computes the current balance of an account by aggregating all posted transfers.
 *
 * The balance calculation depends on the account's balance type:
 * - **DEBIT accounts**: balance = sum(debits) - sum(credits)
 * - **CREDIT accounts**: balance = sum(credits) - sum(debits)
 *
 * Only transfers with state "POSTED" are included in the calculation. Pending or voided
 * transfers are excluded.
 *
 * @param accountId - The ID of the account to compute the balance for
 * @returns A promise that resolves to either:
 *   - An object containing the account's `balanceType` ("DEBIT" | "CREDIT"), `value` (Prisma.Decimal), `minimumBalance` (Prisma.Decimal), and `maximumBalance` (Prisma.Decimal | null)
 *   - A `KnownError` if the account is not found or an unknown balance type is encountered
 *
 * @example
 * ```ts
 * const result = await computeAccountBalance(123n);
 * if (result instanceof KnownError) {
 *   console.error(result.message);
 * } else {
 *   console.log(`Balance: ${result.value.toString()} (${result.balanceType})`);
 * }
 * ```
 */
export async function computeAccountBalance(accountId: bigint): Promise<
	| {
		balanceType: "DEBIT" | "CREDIT";
		value: Prisma.Decimal;
		minimumBalance: Prisma.Decimal;
		maximumBalance: Prisma.Decimal | null;
	}
	| KnownError
> {
	// DEBIT: balance = DEBIT - CREDIT
	// CREDIT: balance = CREDIT - DEBIT
	const pg = getPG();
	const [debitResult, creditResult] = await Promise.all([
		pg<AccountWithBalance[]>`
			SELECT 
				COALESCE(SUM(t.amount), 0) AS total,
				a.balance_type,
				a.minimum_balance,
				a.maximum_balance
			FROM accounts AS a
			LEFT JOIN transfers AS t
				ON t.debit_account_id = a.id
			AND t.state = 'POSTED'
			WHERE a.id = ${accountId}
			GROUP BY a.id;
		`,
		pg<{ total: string | null }[]>`
			SELECT COALESCE(SUM(amount::numeric), 0) AS total
			FROM transfers
			WHERE credit_account_id = ${accountId}
			AND state = 'POSTED'
		`,
	]);

	if (debitResult.length === 0) {
		return new KnownError("Account not found");
	}

	const accountData = debitResult[0];
	if (!accountData) {
		return new KnownError("Account not found");
	}
	const balanceType = accountData.balance_type;
	const totalsDebits = accountData.total;
	const totalsCredits = creditResult[0]?.total;

	assertNotNull(
		totalsCredits,
		"computeAccountBalance: got null in totalCredits",
	);
	assertNotNull(
		totalsDebits,
		"computeAccountBalance: got null in totalsDebits",
	);

	const debitTotal = new Prisma.Decimal(totalsDebits || "0");
	const creditTotal = new Prisma.Decimal(totalsCredits || "0");

	const balance = (() => {
		switch (balanceType) {
			case "DEBIT": {
				return debitTotal.minus(creditTotal);
			}
			case "CREDIT": {
				return creditTotal.minus(debitTotal);
			}
			default: {
				return new KnownError(`Unknown balance type ${balanceType}`);
			}
		}
	})();

	if (balance instanceof KnownError) {
		return balance;
	}

	return {
		balanceType,
		value: balance,
		minimumBalance: new Prisma.Decimal(accountData.minimum_balance),
		maximumBalance: accountData.maximum_balance
			? new Prisma.Decimal(accountData.maximum_balance)
			: null,
	};
}

/**
 * Validates that a transfer would not violate account balance constraints.
 *
 * @param balanceType - The account's balance type ("DEBIT" | "CREDIT")
 * @param currentBalance - The current balance of the account (from POSTED transfers only)
 * @param transferAmount - The amount being transferred
 * @param isDebitAccount - Whether this account is the debit_account_id (true) or credit_account_id (false)
 * @param minimumBalance - The minimum allowed balance for this account
 * @param maximumBalance - The maximum allowed balance for this account (null means no limit, treated as Infinity)
 * @returns A KnownError if constraints would be violated, null otherwise
 */
export function validateBalanceConstraints(
	balanceType: "DEBIT" | "CREDIT",
	currentBalance: Prisma.Decimal,
	transferAmount: Prisma.Decimal,
	isDebitAccount: boolean,
	minimumBalance: Prisma.Decimal,
	maximumBalance: Prisma.Decimal | null,
): KnownError | null {
	let projectedBalance: Prisma.Decimal;

	if (balanceType === "DEBIT") {
		// DEBIT: balance = debits - credits
		if (isDebitAccount) {
			// Being debited: debits increase, so balance increases
			projectedBalance = currentBalance.plus(transferAmount);
		} else {
			// Being credited: credits increase, so balance decreases
			projectedBalance = currentBalance.minus(transferAmount);
		}
	} else {
		// CREDIT: balance = credits - debits
		if (isDebitAccount) {
			// Being debited: debits increase, so balance decreases
			projectedBalance = currentBalance.minus(transferAmount);
		} else {
			// Being credited: credits increase, so balance increases
			projectedBalance = currentBalance.plus(transferAmount);
		}
	}

	// Check minimum balance constraint
	if (projectedBalance.lt(minimumBalance)) {
		return new KnownError(
			`Transfer would violate minimum balance constraint. Current balance: ${currentBalance.toString()}, projected balance: ${projectedBalance.toString()}, minimum: ${minimumBalance.toString()}`,
		);
	}

	// Check maximum balance constraint (null means no limit, treated as Infinity)
	if (maximumBalance !== null && projectedBalance.gt(maximumBalance)) {
		return new KnownError(
			`Transfer would violate maximum balance constraint. Current balance: ${currentBalance.toString()}, projected balance: ${projectedBalance.toString()}, maximum: ${maximumBalance.toString()}`,
		);
	}

	return null;
}
