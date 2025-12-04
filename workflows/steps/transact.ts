import { getPG } from "@/domain/db/postgres";
import {
	computeAccountBalance,
	validateBalanceConstraints,
} from "@/domain/fns/biz-logic/accounts";
import { getCurrency } from "@/domain/fns/reads/currencies";
import { assertCheck, assertNotNull } from "@/domain/utils/assertion-fns";
import {
	isPositiveDecimal,
	parseDecimal,
	validateDecimalPlaces,
} from "@/domain/utils/decimal";
import { getLogContext } from "@/domain/utils/log-util";
import { Objects } from "@/domain/utils/objects";
import { CBOR } from "@/domain/utils/serde/cbor";
import { ArkErrors, type } from "arktype";
import { AssertionError } from "assert";

const TransferRequestBody = type({
	debitAccountId: "number.integer | bigint",
	creditAccountId: "number.integer | bigint",
	ledgerId: "number.integer",
	amount: "string",
	reference: "string?",
	externalId: "string?",
});

type Account = {
	id: string;
	ledger_id: number;
	currency_code: string;
	balance_type: "DEBIT" | "CREDIT";
	minimum_balance: string;
	maximum_balance: string | null;
	created_at: Date;
};

export async function handleTransferRequest(transferRequestId: string) {
	"use step";
	const pg = getPG();
	const logger = await getLogContext({
		transferRequestId,
		method: "handleTransferRequest",
	});
	try {
		await pg.begin(async (pgtx) => {
			logger.info("started processing transfer request");
			try {
				const requests = await pgtx<{
					id: string;
					body: Uint8Array;
					status: string;
				}[]>`
				SELECT id, body, status FROM "transfer_requests"
				WHERE id = ${transferRequestId} AND status = 'PENDING'
				FOR UPDATE
				LIMIT 1
			`;
				const body = requests.at(0)?.body;
				if (!body) {
					logger.info("transfer request not found", {
						transferRequestId,
					});
					return;
				}
				const result = TransferRequestBody(CBOR.unpack(body));
				if (result instanceof ArkErrors) {
					await pgtx`
						UPDATE "transfer_requests"
						SET status = 'INVALID',
							"run_info" = ${JSON.stringify(result)}
						WHERE id = ${transferRequestId}
					`;
					return;
				}

				assertCheck(
					result.debitAccountId !== result.creditAccountId,
					`Cannot transfer within the same account`,
				);

				const getAccountsNonDeadlocking = async () => {
					// Lock accounts in consistent order (by ID) to prevent deadlocks
					const accountIds = [
						result.debitAccountId,
						result.creditAccountId,
					].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
					const accountQueries = accountIds.map(
						(id) =>
							pgtx<
								Account[]
							>`SELECT id, ledger_id, currency_code, balance_type, minimum_balance, maximum_balance, created_at FROM accounts WHERE id = ${
								Number(id)
							} FOR UPDATE`,
					);
					const resultQueries = await Promise.all(accountQueries);
					const results = resultQueries.map((r) => r[0]);
					logger.info("accounts have been read");
					const cacheMap = {} as Record<string, Account>;
					results.forEach((account) => {
						if (!account) return;
						cacheMap[account.id] = account;
					});
					const debitAccount = cacheMap[result.debitAccountId.toString()];
					const creditAccount = cacheMap[result.creditAccountId.toString()];
					return { debitAccount, creditAccount };
				};

				const { debitAccount, creditAccount } =
					await getAccountsNonDeadlocking();
				assertNotNull(
					debitAccount,
					`Debit account ${result.debitAccountId} does not exist`,
				);
				assertNotNull(
					creditAccount,
					`Credit account ${result.creditAccountId} does not exist`,
				);
				assertCheck(
					debitAccount.id !== creditAccount.id,
					`Accounts cannot be the same`,
				);
				assertCheck(
					isPositiveDecimal(result.amount),
					`Transfer amount must be a positive decimal string`,
				);
				assertCheck(
					debitAccount.currency_code === creditAccount.currency_code,
					`Accounts must have the same currency`,
				);
				assertCheck(
					debitAccount.ledger_id === result.ledgerId,
					`debitAccount ledger ID does not match transfer ledger ID`,
				);
				assertCheck(
					creditAccount.ledger_id === result.ledgerId,
					`creditAccount ledger ID does not match transfer ledger ID`,
				);

				// Get currency to validate minorUnits
				const currency = await getCurrency(debitAccount.currency_code);
				if (!currency) {
					throw new Error(
						`Currency ${debitAccount.currency_code} not found`,
					);
				}

				// Parse and validate amount
				const transferAmount = parseDecimal(result.amount);
				if (!validateDecimalPlaces(transferAmount, currency.minor_units)) {
					throw new Error(
						`Amount ${result.amount} has more than ${currency.minor_units} decimal places for currency ${currency.code}`,
					);
				}

				// Validate balance constraints
				const debitAccountBalanceResult = await computeAccountBalance(
					BigInt(debitAccount.id),
				);
				const creditAccountBalanceResult = await computeAccountBalance(
					BigInt(creditAccount.id),
				);

				if (debitAccountBalanceResult instanceof Error) {
					throw debitAccountBalanceResult;
				}
				if (creditAccountBalanceResult instanceof Error) {
					throw creditAccountBalanceResult;
				}

				// Validate debit account constraints
				const debitValidationError = validateBalanceConstraints(
					debitAccountBalanceResult.balanceType,
					debitAccountBalanceResult.value,
					transferAmount,
					true, // isDebitAccount = true
					debitAccountBalanceResult.minimumBalance,
					debitAccountBalanceResult.maximumBalance,
				);
				if (debitValidationError) {
					throw debitValidationError;
				}

				// Validate credit account constraints
				const creditValidationError = validateBalanceConstraints(
					creditAccountBalanceResult.balanceType,
					creditAccountBalanceResult.value,
					transferAmount,
					false, // isDebitAccount = false
					creditAccountBalanceResult.minimumBalance,
					creditAccountBalanceResult.maximumBalance,
				);
				if (creditValidationError) {
					throw creditValidationError;
				}

				const transferPrep = {
					id: crypto.randomUUID(),
					externalId: result.externalId || null,
					currencyCode: debitAccount.currency_code,
					debitAccountId: debitAccount.id,
					creditAccountId: creditAccount.id,
					amount: transferAmount.toString(),
					reference: result.reference || null,
					state: "POSTED" as const,
					createdAt: new Date(),
				};

				const transfer = Objects.keysCamelToSnake(transferPrep);

				logger.info("commiting ledger entries and transfer");
				await pgtx`INSERT INTO transfers ${pgtx(transfer)}`;
				logger.info("ledger entries and transfer committed");
				await pgtx`INSERT INTO transfer_meta_data ${
					pgtx({
						id: crypto.randomUUID(),
						transfer_id: transfer.id,
					})
				}`;
				logger.info("transfer meta data committed");
				await pgtx`
					UPDATE "transfer_requests"
					SET status = 'COMPLETED', transfer_id = ${transfer.id}
					WHERE id = ${transferRequestId}
				`;
				logger.info("transfer request marked as completed");
				logger.info("transfer completed");
			} catch (err) {
				const error = err as Error;
				const errorBlob = {
					message: error.message,
					cause: error.cause,
					name: error.name,
				};
				logger.warn("transfer failed", {
					message: error.message,
					stack: error.stack,
				});
				await pgtx`
					UPDATE "transfer_requests"
					SET status = 'FAILED', run_info = ${JSON.stringify(errorBlob)}
					WHERE id = ${transferRequestId}
				`;
				if (err instanceof AssertionError) {
					logger.warn("transfer failed due to assertion error");
				}
			}
		});
	} catch (err) {
		logger.warn("transfer hander db transaction failed");
		logger.error(err as Error);
	}
}
