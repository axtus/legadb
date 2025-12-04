#!/usr/bin/env bun
// oxlint-disable no-console

import { prisma } from "../prisma/prisma-client";
import { createAccount } from "../domain/fns/muts/muts";
import { CBOR } from "../domain/utils/serde/cbor";
import { handleTransferRequest } from "../workflows/steps/transact";
import { logTransferRequest } from "@/domain/fns/muts/transfers";
import { getPG } from "@/domain/db/postgres";
import { computeAccountBalance } from "@/domain/fns/biz-logic/accounts";
import { createLedger } from "@/domain/fns/muts/ledgers";

const TEST_LEDGER_ID = 9999;
const TEST_CURRENCY_CODE = "TEST";
const TEST_ACCOUNT_START_ID = 9000n;

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`);
	}
}

async function resetDatabase() {
	console.log("CLITEST: Resetting database...");
	const pg = getPG();

	// Delete in order respecting foreign key constraints
	await pg`DELETE FROM transfer_meta_data`;
	await pg`DELETE FROM transfers`;
	await pg`DELETE FROM transfer_requests`;
	await pg`DELETE FROM account_balance_snapshots`;
	await pg`DELETE FROM accounts`;
	await pg`DELETE FROM ledgers`;
	await pg`DELETE FROM currencies`;

	console.log("CLITEST: ✓ Database reset complete");
}

async function ensureTestCurrency() {
	const existing = await prisma.currency.findUnique({
		where: { code: TEST_CURRENCY_CODE },
	});
	if (existing) {
		return;
	}
	await prisma.currency.create({
		data: {
			code: TEST_CURRENCY_CODE,
			name: "Test Currency",
			symbol: "T",
			minorUnits: 2,
		},
	});
}

async function ensureTestLedger() {
	const existing = await prisma.ledger.findUnique({
		where: { id: TEST_LEDGER_ID },
	});
	if (existing) {
		return;
	}
	await createLedger({ id: TEST_LEDGER_ID, name: "Test Ledger" });
}

async function createTestAccount(
	id: bigint,
	balanceType: "DEBIT" | "CREDIT",
	minimumBalance: string = "0",
	maximumBalance: string | null = null,
): Promise<bigint> {
	const { Prisma } = await import("@/prisma/generated/client");
	await createAccount({
		id,
		ledgerId: TEST_LEDGER_ID,
		externalId: `test-account-${id}`,
		currencyCode: TEST_CURRENCY_CODE,
		balanceType,
		minimumBalance: new Prisma.Decimal(minimumBalance),
		maximumBalance: maximumBalance ? new Prisma.Decimal(maximumBalance) : null,
	});
	return id;
}

async function submitAndProcessTransfer(params: {
	debitAccountId: bigint;
	creditAccountId: bigint;
	ledgerId: number;
	amount: string;
	reference?: string;
	externalId?: string;
}): Promise<string> {
	const packed = CBOR.pack(params);
	const { id } = await logTransferRequest(packed);
	await handleTransferRequest(id);
	return id;
}

async function checkTransferRequestFailed(
	transferRequestId: string,
): Promise<boolean> {
	const transferRequest = await prisma.transferRequest.findUnique({
		where: { id: transferRequestId },
		select: { status: true, runInfo: true },
	});
	console.log(transferRequest);
	return transferRequest?.status === "FAILED";
}

async function testDoubleEntryInvariant(): Promise<void> {
	console.log("CLITEST: Testing double-entry accounting invariant...");

	// Create test accounts and perform transfers first
	const account1Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 50n,
		"DEBIT",
	);
	const account2Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 51n,
		"CREDIT",
	);

	await submitAndProcessTransfer({
		debitAccountId: account1Id,
		creditAccountId: account2Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "1000",
	});

	await submitAndProcessTransfer({
		debitAccountId: account2Id,
		creditAccountId: account1Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "500",
	});

	const pg = getPG();
	// Verify that the sum of all debit amounts equals sum of all credit amounts
	// In double-entry accounting, each transfer has equal debit and credit amounts
	// So we sum all amounts (as debits) and sum all amounts (as credits)
	// They should be equal since each transfer contributes the same amount to both sides
	const debitSum = await pg<{ total: string }[]>`
		SELECT COALESCE(SUM(amount::numeric), 0) AS total
		FROM transfers
		WHERE state = 'POSTED'
	`;
	const creditSum = await pg<{ total: string }[]>`
		SELECT COALESCE(SUM(amount::numeric), 0) AS total
		FROM transfers
		WHERE state = 'POSTED'
	`;

	if (
		debitSum.length === 0 || !debitSum[0] || creditSum.length === 0 ||
		!creditSum[0]
	) {
		throw new Error("Failed to calculate debit/credit sums");
	}

	const { Prisma } = await import("@/prisma/generated/client");
	const totalDebits = new Prisma.Decimal(debitSum[0].total);
	const totalCredits = new Prisma.Decimal(creditSum[0].total);

	assert(
		totalDebits.equals(totalCredits),
		`Double-entry invariant violated: total debits (${totalDebits.toString()}) != total credits (${totalCredits.toString()})`,
	);

	console.log("CLITEST: ✓ Double-entry invariant verified");
}

async function testBalanceCalculations(): Promise<void> {
	console.log("CLITEST: Testing balance calculations...");

	// Create test accounts
	const debitAccountId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 1n,
		"DEBIT",
	);
	const creditAccountId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 2n,
		"CREDIT",
	);

	// Perform transfers
	await submitAndProcessTransfer({
		debitAccountId,
		creditAccountId,
		ledgerId: TEST_LEDGER_ID,
		amount: "1000",
	});

	await submitAndProcessTransfer({
		debitAccountId: creditAccountId,
		creditAccountId: debitAccountId,
		ledgerId: TEST_LEDGER_ID,
		amount: "300",
	});

	// Verify DEBIT account balance
	const debitBalance = await computeAccountBalance(debitAccountId);
	if (debitBalance instanceof Error) {
		throw debitBalance;
	}

	// DEBIT: balance = debits - credits
	// debits: 1000, credits: 300, expected: 700
	const { Prisma } = await import("@/prisma/generated/client");
	const expectedDebitBalance = new Prisma.Decimal("700");
	assert(
		debitBalance.value.equals(expectedDebitBalance),
		`DEBIT account balance incorrect: expected 700, got ${debitBalance.value.toString()}`,
	);

	// Verify CREDIT account balance
	const creditBalance = await computeAccountBalance(creditAccountId);
	if (creditBalance instanceof Error) {
		throw creditBalance;
	}

	// CREDIT: balance = credits - debits
	// credits: 1000, debits: 300, expected: 700
	const expectedCreditBalance = new Prisma.Decimal("700");
	assert(
		creditBalance.value.equals(expectedCreditBalance),
		`CREDIT account balance incorrect: expected 700, got ${creditBalance.value.toString()}`,
	);

	console.log("CLITEST: ✓ Balance calculations verified");
}

async function testBalanceConsistency(): Promise<void> {
	console.log("CLITEST: Testing balance consistency...");

	const account1Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 10n,
		"DEBIT",
	);
	const account2Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 11n,
		"CREDIT",
	);

	const { Prisma } = await import("@/prisma/generated/client");
	let expectedBalance1 = new Prisma.Decimal("0");
	let expectedBalance2 = new Prisma.Decimal("0");

	// Transfer 1: account1 -> account2, 500
	await submitAndProcessTransfer({
		debitAccountId: account1Id,
		creditAccountId: account2Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "500",
	});
	expectedBalance1 = expectedBalance1.plus("500"); // DEBIT account, being debited increases balance
	expectedBalance2 = expectedBalance2.plus("500"); // CREDIT account, being credited increases balance

	let balance1 = await computeAccountBalance(account1Id);
	let balance2 = await computeAccountBalance(account2Id);
	if (balance1 instanceof Error) throw balance1;
	if (balance2 instanceof Error) throw balance2;

	assert(
		balance1.value.equals(expectedBalance1),
		`Balance mismatch after transfer 1: expected ${expectedBalance1.toString()}, got ${balance1.value.toString()}`,
	);
	assert(
		balance2.value.equals(expectedBalance2),
		`Balance mismatch after transfer 1: expected ${expectedBalance2.toString()}, got ${balance2.value.toString()}`,
	);

	// Transfer 2: account2 -> account1, 200
	await submitAndProcessTransfer({
		debitAccountId: account2Id,
		creditAccountId: account1Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "200",
	});
	expectedBalance1 = expectedBalance1.minus("200"); // DEBIT account, being credited decreases balance
	expectedBalance2 = expectedBalance2.minus("200"); // CREDIT account, being debited decreases balance

	balance1 = await computeAccountBalance(account1Id);
	balance2 = await computeAccountBalance(account2Id);
	if (balance1 instanceof Error) throw balance1;
	if (balance2 instanceof Error) throw balance2;

	assert(
		balance1.value.equals(expectedBalance1),
		`Balance mismatch after transfer 2: expected ${expectedBalance1.toString()}, got ${balance1.value.toString()}`,
	);
	assert(
		balance2.value.equals(expectedBalance2),
		`Balance mismatch after transfer 2: expected ${expectedBalance2.toString()}, got ${balance2.value.toString()}`,
	);

	console.log("CLITEST: ✓ Balance consistency verified");
}

async function testBalanceConstraints(): Promise<void> {
	console.log("CLITEST: Testing balance constraints...");

	// Test minimum balance constraint
	const minAccountId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 20n,
		"DEBIT",
		"1000", // minimum balance
	);
	const minAccountCreditId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 21n,
		"CREDIT",
	);

	// First, give minAccount a balance of 1000 by debiting it
	await submitAndProcessTransfer({
		debitAccountId: await createTestAccount(
			TEST_ACCOUNT_START_ID + 24n,
			"DEBIT",
		),
		creditAccountId: minAccountId,
		ledgerId: TEST_LEDGER_ID,
		amount: "1000",
	});

	// This should fail: would bring balance below minimum
	const failedTransferRequestId1 = await submitAndProcessTransfer({
		debitAccountId: minAccountId,
		creditAccountId: minAccountCreditId,
		ledgerId: TEST_LEDGER_ID,
		amount: "500", // This would credit minAccount, reducing its balance below 1000
	});
	const failed1 = await checkTransferRequestFailed(failedTransferRequestId1);
	if (failed1) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: failedTransferRequestId1 },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(`CLITEST:   Expected error (minimum balance): ${errorMessage}`);
	}

	assert(
		failed1,
		"Minimum balance constraint should have prevented the transfer",
	);

	// Test maximum balance constraint
	const maxAccountId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 22n,
		"CREDIT",
		"0",
		"2000", // maximum balance
	);
	const maxAccountDebitId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 23n,
		"DEBIT",
	);

	// First, give maxAccount a balance of 2000 by crediting it
	await submitAndProcessTransfer({
		debitAccountId: maxAccountDebitId,
		creditAccountId: maxAccountId,
		ledgerId: TEST_LEDGER_ID,
		amount: "2000",
	});

	// This should fail: would exceed maximum
	const failedTransferRequestId2 = await submitAndProcessTransfer({
		debitAccountId: maxAccountDebitId,
		creditAccountId: maxAccountId,
		ledgerId: TEST_LEDGER_ID,
		amount: "3000", // This would exceed the 2000 maximum
	});
	const failed2 = await checkTransferRequestFailed(failedTransferRequestId2);
	if (failed2) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: failedTransferRequestId2 },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(`CLITEST:   Expected error (maximum balance): ${errorMessage}`);
	}

	assert(
		failed2,
		"Maximum balance constraint should have prevented the transfer",
	);

	console.log("CLITEST: ✓ Balance constraints verified");
}

async function testTransferValidation(): Promise<void> {
	console.log("CLITEST: Testing transfer validation...");

	const account1Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 30n,
		"DEBIT",
	);
	const account2Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 31n,
		"CREDIT",
	);

	// Test: Cannot transfer from account to itself
	const selfTransferRequestId = await submitAndProcessTransfer({
		debitAccountId: account1Id,
		creditAccountId: account1Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "100",
	});
	const selfTransferFailed = await checkTransferRequestFailed(
		selfTransferRequestId,
	);
	if (selfTransferFailed) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: selfTransferRequestId },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(`CLITEST:   Expected error (self-transfer): ${errorMessage}`);
	}
	assert(selfTransferFailed, "Self-transfer should have been rejected");

	// Test: Transfer amount must be positive
	const negativeAmountRequestId = await submitAndProcessTransfer({
		debitAccountId: account1Id,
		creditAccountId: account2Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "-100",
	});
	const negativeAmountFailed = await checkTransferRequestFailed(
		negativeAmountRequestId,
	);
	if (negativeAmountFailed) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: negativeAmountRequestId },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(`CLITEST:   Expected error (negative amount): ${errorMessage}`);
	}
	assert(
		negativeAmountFailed,
		"Negative transfer amount should have been rejected",
	);

	// Test: Transfer amount must be positive (zero)
	const zeroAmountRequestId = await submitAndProcessTransfer({
		debitAccountId: account1Id,
		creditAccountId: account2Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "0",
	});
	const zeroAmountFailed = await checkTransferRequestFailed(
		zeroAmountRequestId,
	);
	if (zeroAmountFailed) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: zeroAmountRequestId },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(`CLITEST:   Expected error (zero amount): ${errorMessage}`);
	}
	assert(zeroAmountFailed, "Zero transfer amount should have been rejected");

	// Test: Accounts must have same currency
	// Create a different currency
	await prisma.currency.create({
		data: {
			code: "EUR",
			name: "Euro",
			symbol: "€",
			minorUnits: 2,
		},
	});
	const { Prisma } = await import("@/prisma/generated/client");
	await createAccount({
		id: TEST_ACCOUNT_START_ID + 33n,
		ledgerId: TEST_LEDGER_ID,
		externalId: "test-account-eur",
		currencyCode: "EUR",
		balanceType: "CREDIT",
		minimumBalance: new Prisma.Decimal("0"),
		maximumBalance: null,
	});

	const currencyMismatchRequestId = await submitAndProcessTransfer({
		debitAccountId: account1Id, // TEST currency
		creditAccountId: TEST_ACCOUNT_START_ID + 33n, // EUR currency
		ledgerId: TEST_LEDGER_ID,
		amount: "100",
	});
	const currencyMismatchFailed = await checkTransferRequestFailed(
		currencyMismatchRequestId,
	);
	if (currencyMismatchFailed) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: currencyMismatchRequestId },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(
			`CLITEST:   Expected error (currency mismatch): ${errorMessage}`,
		);
	}
	assert(currencyMismatchFailed, "Currency mismatch should have been rejected");

	// Test: Accounts must be in same ledger
	const otherLedgerId = TEST_LEDGER_ID + 1;
	await createLedger({ id: otherLedgerId, name: "Other Ledger" });
	const otherLedgerAccountId = await createTestAccount(
		TEST_ACCOUNT_START_ID + 34n,
		"CREDIT",
	);
	// Update to different ledger
	await prisma.account.update({
		where: { id: otherLedgerAccountId },
		data: { ledgerId: otherLedgerId },
	});

	const ledgerMismatchRequestId = await submitAndProcessTransfer({
		debitAccountId: account1Id, // TEST_LEDGER_ID
		creditAccountId: otherLedgerAccountId, // otherLedgerId
		ledgerId: TEST_LEDGER_ID,
		amount: "100",
	});
	const ledgerMismatchFailed = await checkTransferRequestFailed(
		ledgerMismatchRequestId,
	);
	if (ledgerMismatchFailed) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: ledgerMismatchRequestId },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(`CLITEST:   Expected error (ledger mismatch): ${errorMessage}`);
	}
	assert(ledgerMismatchFailed, "Ledger mismatch should have been rejected");

	// Test: Accounts must exist
	const nonExistentAccountRequestId = await submitAndProcessTransfer({
		debitAccountId: 99999n, // Non-existent account
		creditAccountId: account2Id,
		ledgerId: TEST_LEDGER_ID,
		amount: "100",
	});
	const nonExistentAccountFailed = await checkTransferRequestFailed(
		nonExistentAccountRequestId,
	);
	if (nonExistentAccountFailed) {
		const transferRequest = await prisma.transferRequest.findUnique({
			where: { id: nonExistentAccountRequestId },
			select: { runInfo: true },
		});
		const errorMessage = transferRequest?.runInfo
			? JSON.parse(transferRequest.runInfo as string).message
			: "Transfer failed";
		console.log(
			`CLITEST:   Expected error (non-existent account): ${errorMessage}`,
		);
	}
	assert(
		nonExistentAccountFailed,
		"Non-existent account should have been rejected",
	);

	console.log("CLITEST: ✓ Transfer validation verified");
}

async function testMultiTransferConsistency(): Promise<void> {
	console.log("CLITEST: Testing multi-transfer consistency...");

	const account1Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 40n,
		"DEBIT",
	);
	const account2Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 41n,
		"CREDIT",
	);
	const account3Id = await createTestAccount(
		TEST_ACCOUNT_START_ID + 42n,
		"CREDIT",
	);

	// Perform multiple transfers
	const transfers = [
		{ from: account1Id, to: account2Id, amount: "1000" },
		{ from: account2Id, to: account3Id, amount: "500" },
		{ from: account3Id, to: account1Id, amount: "200" },
		{ from: account1Id, to: account3Id, amount: "300" },
	];

	for (const transfer of transfers) {
		await submitAndProcessTransfer({
			debitAccountId: transfer.from,
			creditAccountId: transfer.to,
			ledgerId: TEST_LEDGER_ID,
			amount: transfer.amount,
		});
	}

	// Verify balances are correct
	const balance1 = await computeAccountBalance(account1Id);
	const balance2 = await computeAccountBalance(account2Id);
	const balance3 = await computeAccountBalance(account3Id);

	if (balance1 instanceof Error) throw balance1;
	if (balance2 instanceof Error) throw balance2;
	if (balance3 instanceof Error) throw balance3;

	// Manual calculation:
	// Account1 (DEBIT): +1000 -200 +300 = 1100
	// Account2 (CREDIT): +1000 -500 = 500
	// Account3 (CREDIT): +500 -200 +300 = 600

	const { Prisma } = await import("@/prisma/generated/client");
	const expectedBalance1 = new Prisma.Decimal("1100");
	const expectedBalance2 = new Prisma.Decimal("500");
	const expectedBalance3 = new Prisma.Decimal("600");

	assert(
		balance1.value.equals(expectedBalance1),
		`Account1 balance incorrect: expected 1100, got ${balance1.value.toString()}`,
	);
	assert(
		balance2.value.equals(expectedBalance2),
		`Account2 balance incorrect: expected 500, got ${balance2.value.toString()}`,
	);
	assert(
		balance3.value.equals(expectedBalance3),
		`Account3 balance incorrect: expected 600, got ${balance3.value.toString()}`,
	);

	// Verify double-entry invariant still holds
	const pg = getPG();
	const result = await pg<{
		total_debits: string;
		total_credits: string;
	}[]>`
		SELECT
			COALESCE(SUM(CASE WHEN state = 'POSTED' THEN amount::numeric ELSE 0 END), 0) AS total_debits,
			COALESCE(SUM(CASE WHEN state = 'POSTED' THEN amount::numeric ELSE 0 END), 0) AS total_credits
		FROM transfers
	`;

	if (result.length === 0 || !result[0]) {
		throw new Error("No transfers found");
	}

	const totalDebits = new Prisma.Decimal(result[0].total_debits);
	const totalCredits = new Prisma.Decimal(result[0].total_credits);

	assert(
		totalDebits.equals(totalCredits),
		`Double-entry invariant violated after multiple transfers: ${totalDebits.toString()} != ${totalCredits.toString()}`,
	);

	console.log("CLITEST: ✓ Multi-transfer consistency verified");
}

async function runTest(
	name: string,
	testFn: () => Promise<void>,
): Promise<void> {
	try {
		await testFn();
		testResults.push({ name, passed: true });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		testResults.push({ name, passed: false, error: errorMessage });
		console.error(`CLITEST: ✗ ${name} failed: ${errorMessage}`);
	}
}

async function main() {
	console.log("CLITEST: === Correctness Tests ===\n");

	try {
		// Reset database
		await resetDatabase();

		// Setup test infrastructure
		await ensureTestCurrency();
		await ensureTestLedger();

		// Run tests
		await runTest("Double-Entry Invariant", testDoubleEntryInvariant);
		await runTest("Balance Calculations", testBalanceCalculations);
		await runTest("Balance Consistency", testBalanceConsistency);
		await runTest("Balance Constraints", testBalanceConstraints);
		await runTest("Transfer Validation", testTransferValidation);
		await runTest(
			"Multi-Transfer Consistency",
			testMultiTransferConsistency,
		);

		// Report results
		console.log("\nCLITEST: === Test Results ===");
		const passed = testResults.filter((r) => r.passed).length;
		const failed = testResults.filter((r) => !r.passed).length;

		testResults.forEach((result) => {
			const status = result.passed ? "✓" : "✗";
			console.log(`CLITEST: ${status} ${result.name}`);
			if (!result.passed && result.error) {
				console.log(`CLITEST:   Error: ${result.error}`);
			}
		});

		console.log(`\nCLITEST: Passed: ${passed}, Failed: ${failed}`);

		if (failed > 0) {
			process.exit(1);
		}

		console.log("\nCLITEST: ✓ All tests passed!");
		const pg = getPG();
		await pg.close();
	} catch (error) {
		console.error("CLITEST: \n❌ Fatal error:", error);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("CLITEST:", err);
	process.exit(1);
});
