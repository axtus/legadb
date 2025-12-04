#!/usr/bin/env bun
// oxlint-disable no-console

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "../prisma/prisma-client";
import { createAccount } from "../domain/fns/muts/muts";
import { CBOR } from "../domain/utils/serde/cbor";
import { handleTransferRequest } from "../workflows/steps/transact";
import { logTransferRequest } from "@/domain/fns/muts/transfers";
import { getPG } from "@/domain/db/postgres";
import { createLedger } from "@/domain/fns/muts/ledgers";

const API_BASE_URL = process.env.API_URL || "http://localhost:7373";

const CURRENCY_CODE = "USD";
const LEDGER_ID = 1;
const ROOT_ACCOUNT_ID = 1000n;
const NUM_ACCOUNTS = 100;
const INITIAL_BALANCE_PER_ACCOUNT = 1000000; // $10,000.00 in cents
const BENCHMARK_TRANSFERS = 100000;

interface BenchmarkStats {
	totalTime: number;
	successCount: number;
	errorCount: number;
	latencies: number[];
}

/**
 * Helper to submit a transfer request with proper type casting
 */
export async function submitTransferRequest(params: {
	debitAccountId: bigint;
	creditAccountId: bigint;
	ledgerId: number;
	amount: string;
	reference?: string;
	externalId?: string;
}) {
	const packed = CBOR.pack(params);
	return logTransferRequest(packed);
}

async function ensureCurrency() {
	const existing = await prisma.currency.findUnique({
		where: { code: CURRENCY_CODE },
	});
	if (existing) {
		console.log(`CLITEST: ✓ Currency ${CURRENCY_CODE} already exists`);
		return;
	}
	await prisma.currency.create({
		data: {
			code: CURRENCY_CODE,
			name: "US Dollar",
			symbol: "$",
			minorUnits: 2,
		},
	});
	console.log(`CLITEST: ✓ Created currency ${CURRENCY_CODE}`);
}

async function ensureLedger() {
	const existing = await prisma.ledger.findUnique({
		where: { id: LEDGER_ID },
	});
	if (existing) {
		console.log(`CLITEST: ✓ Ledger ${LEDGER_ID} already exists`);
		return;
	}
	await createLedger({ id: LEDGER_ID, name: "Benchmark Ledger" });
	console.log(`CLITEST: ✓ Created ledger ${LEDGER_ID}`);
}

async function ensureRootAccount() {
	const existing = await prisma.account.findUnique({
		where: { id: ROOT_ACCOUNT_ID },
	});
	if (existing) {
		console.log(`CLITEST: ✓ Root account ${ROOT_ACCOUNT_ID} already exists`);
		return ROOT_ACCOUNT_ID;
	}
	await createAccount({
		id: ROOT_ACCOUNT_ID,
		ledgerId: LEDGER_ID,
		externalId: `root-${ROOT_ACCOUNT_ID}`,
		currencyCode: CURRENCY_CODE,
		balanceType: "DEBIT",
		minimumBalance: new Prisma.Decimal(0),
		maximumBalance: null, // No limit for root account
	});
	console.log(`CLITEST: ✓ Created root account ${ROOT_ACCOUNT_ID}`);
	return ROOT_ACCOUNT_ID;
}

async function createAccounts() {
	const accountIds: bigint[] = [];
	const startId = 2000n;

	for (let i = 0; i < NUM_ACCOUNTS; i++) {
		const accountId = startId + BigInt(i);
		const existing = await prisma.account.findUnique({
			where: { id: accountId },
		});
		if (existing) {
			accountIds.push(accountId);
			continue;
		}
		await createAccount({
			id: accountId,
			ledgerId: LEDGER_ID,
			externalId: `account-${accountId}`,
			currencyCode: CURRENCY_CODE,
			balanceType: "CREDIT",
			minimumBalance: new Prisma.Decimal(0),
			maximumBalance: new Prisma.Decimal(50000000), // $500,000.00 in cents - reasonable limit for test accounts
		});
		accountIds.push(accountId);
		if ((i + 1) % 10 === 0) {
			console.log(`CLITEST:   Created ${i + 1}/${NUM_ACCOUNTS} accounts...`);
		}
	}
	console.log(`CLITEST: ✓ Created ${NUM_ACCOUNTS} accounts`);
	return accountIds;
}

async function processPendingTransferRequests() {
	const pg = getPG();

	let processed = 0;
	const batchSize = 100;

	while (true) {
		const result = await pg.begin(async (pgtx) => {
			const requests = await pgtx<{
				id: string;
			}[]>`
				SELECT id FROM "transfer_requests"
				WHERE status = 'PENDING'
				ORDER BY "created_at" ASC
				LIMIT ${batchSize}
			`;

			if (requests.length === 0) {
				return { count: 0 };
			}
			console.log(
				`CLITEST: \nProcessing batch of ${requests.length} transfer requests...`,
			);
			for (const req of requests) {
				await handleTransferRequest(req.id);
			}

			return { count: requests.length };
		});

		if (result.count === 0) {
			break;
		}

		processed += result.count;
		if (processed % 10 === 0) {
			process.stdout.write(
				`CLITEST: \r  Processed ${processed} transfer requests...`,
			);
		}
	}

	if (processed > 0) {
		console.log(`CLITEST: \r  Processed ${processed} transfer requests`);
	}

	return processed;
}

async function initializeBalances(rootAccountId: bigint, accountIds: bigint[]) {
	console.log("CLITEST: Initializing balances from root to accounts...");
	let completed = 0;
	for (const accountId of accountIds) {
		await submitTransferRequest({
			debitAccountId: rootAccountId,
			creditAccountId: accountId,
			ledgerId: LEDGER_ID,
			amount: INITIAL_BALANCE_PER_ACCOUNT.toString(),
			reference: `Initial balance for account ${accountId}`,
		});
		completed++;
		if (completed % 10 === 0) {
			console.log(
				`CLITEST:   Submitted ${completed}/${NUM_ACCOUNTS} transfer requests...`,
			);
		}
	}
	console.log(`CLITEST: ✓ Submitted ${NUM_ACCOUNTS} transfer requests`);

	console.log("CLITEST: Processing transfer requests...");
	await processPendingTransferRequests();
	console.log(`CLITEST: ✓ Initialized balances for ${NUM_ACCOUNTS} accounts`);
}

async function sendTransferRequest(
	debitAccountId: bigint,
	creditAccountId: bigint,
	ledgerId: number,
	amount: string,
): Promise<{ success: boolean; latency: number; error?: string }> {
	const startTime = performance.now();
	try {
		const body = CBOR.pack({
			debitAccountId,
			creditAccountId,
			ledgerId,
			amount,
		});

		const url = `${API_BASE_URL}/api/transfer-request`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/cbor",
			},
			// There are type clashes here between Node's fetch and Bun's fetch.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			body: body as any,
		});

		const latency = performance.now() - startTime;

		if (!response.ok) {
			const errorText = await response.text();
			return {
				success: false,
				latency,
				error: `HTTP ${response.status}: ${errorText}`,
			};
		}

		return { success: true, latency };
	} catch (error) {
		const latency = performance.now() - startTime;
		return {
			success: false,
			latency,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function getRandomAccountPair(accountIds: bigint[]): [bigint, bigint] {
	const idx1 = Math.floor(Math.random() * accountIds.length);
	let idx2 = Math.floor(Math.random() * accountIds.length);
	while (idx2 === idx1) {
		idx2 = Math.floor(Math.random() * accountIds.length);
	}
	return [accountIds[idx1]!, accountIds[idx2]!];
}

function calculateStats(stats: BenchmarkStats) {
	const sortedLatencies = [...stats.latencies].sort((a, b) => a - b);
	const min = sortedLatencies[0] || 0;
	const max = sortedLatencies[sortedLatencies.length - 1] || 0;
	const sum = stats.latencies.reduce((a, b) => a + b, 0);
	const avg = stats.latencies.length > 0 ? sum / stats.latencies.length : 0;
	const median = sortedLatencies.length > 0
		? sortedLatencies[Math.floor(sortedLatencies.length / 2)] || 0
		: 0;
	const p95 = sortedLatencies.length > 0
		? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0
		: 0;
	const p99 = sortedLatencies.length > 0
		? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0
		: 0;

	return {
		totalTime: stats.totalTime,
		throughput: (stats.successCount / stats.totalTime) * 1000, // requests per second
		successCount: stats.successCount,
		errorCount: stats.errorCount,
		min,
		max,
		avg,
		median,
		p95,
		p99,
	};
}

async function queryInsertedRecords() {
	const pg = getPG();

	const results = await pg<{
		transfer_count: string;
		transfer_request_count: string;
	}[]>`
		SELECT
			(SELECT COUNT(*) FROM transfers) as transfer_count,
			(SELECT COUNT(*) FROM transfer_requests) as transfer_request_count
	`;

	if (results.length === 0) return;

	const row = results[0];
	const transferCount = BigInt(row.transfer_count);
	const transferRequestCount = BigInt(row.transfer_request_count);

	console.log("CLITEST: \n=== Database Record Count ===");
	console.log(`CLITEST: Total Transfers:         ${transferCount}`);
	console.log(`CLITEST: Total Transfer Requests: ${transferRequestCount}`);
	console.log(`CLITEST: Expected Transfers:      ${BENCHMARK_TRANSFERS}`);
	console.log(
		`CLITEST: Match: ${
			transferCount === BigInt(BENCHMARK_TRANSFERS) ? "✓ Yes" : "✗ No"
		}`,
	);
}

async function runBenchmark(accountIds: bigint[]) {
	console.log(
		`CLITEST: \n🚀 Starting benchmark: ${BENCHMARK_TRANSFERS} transfer requests...`,
	);
	console.log(`CLITEST:    API: ${API_BASE_URL}`);
	console.log(`CLITEST:    Accounts: ${accountIds.length}`);

	const stats: BenchmarkStats = {
		totalTime: 0,
		successCount: 0,
		errorCount: 0,
		latencies: [],
	};

	const startTime = performance.now();
	const reportInterval = Math.max(1, Math.floor(BENCHMARK_TRANSFERS / 20));
	const errors: string[] = [];

	for (let i = 0; i < BENCHMARK_TRANSFERS; i++) {
		const [debitAccountId, creditAccountId] = getRandomAccountPair(accountIds);
		const amount = (Math.floor(Math.random() * 10000) + 100).toString(); // Random amount between $1.00 and $100.00

		const result = await sendTransferRequest(
			debitAccountId,
			creditAccountId,
			LEDGER_ID,
			amount,
		);

		if (result.success) {
			stats.successCount++;
			stats.latencies.push(result.latency);
		} else {
			throw new Error(result.error);
			// stats.errorCount++;
			// if (errors.length < 10) {
			// 	errors.push(`Request ${i + 1}: ${result.error}`);
			// }
		}

		if ((i + 1) % reportInterval === 0) {
			const elapsed = performance.now() - startTime;
			const rate = ((i + 1) / elapsed) * 1000;
			process.stdout.write(
				`CLITEST: \r  Progress: ${i + 1}/${BENCHMARK_TRANSFERS} (${
					rate.toFixed(0)
				} req/s)`,
			);
		}
	}

	stats.totalTime = performance.now() - startTime;
	console.log("\n");

	return { stats, errors };
}

async function main() {
	console.log("CLITEST: === Benchmark Ingestion Script ===\n");

	try {
		// Initialization phase
		console.log("CLITEST: Phase 1: Initialization");
		console.log("CLITEST: ─────────────────────────────");
		await ensureCurrency();
		await ensureLedger();
		const rootAccountId = await ensureRootAccount();
		const accountIds = await createAccounts();
		await initializeBalances(rootAccountId, accountIds);

		// Benchmark phase
		console.log("CLITEST: \nPhase 2: Benchmark");
		console.log("CLITEST: ─────────────────────────────");
		const { stats, errors } = await runBenchmark(accountIds);

		// Report results
		console.log("CLITEST: \n=== Benchmark Results ===");
		const results = calculateStats(stats);
		console.log(
			`CLITEST: Total Time:        ${(results.totalTime / 1000).toFixed(2)}s`,
		);
		console.log(
			`CLITEST: Throughput:        ${results.throughput.toFixed(2)} req/s`,
		);
		console.log(`CLITEST: Successful:        ${results.successCount}`);
		console.log(`CLITEST: Errors:            ${results.errorCount}`);
		console.log(`CLITEST: \nLatency Statistics (ms):`);
		console.log(`CLITEST:   Min:             ${results.min.toFixed(2)}`);
		console.log(`CLITEST:   Max:             ${results.max.toFixed(2)}`);
		console.log(`CLITEST:   Average:         ${results.avg.toFixed(2)}`);
		console.log(`CLITEST:   Median:          ${results.median.toFixed(2)}`);
		console.log(`CLITEST:   P95:             ${results.p95.toFixed(2)}`);
		console.log(`CLITEST:   P99:             ${results.p99.toFixed(2)}`);

		if (errors.length > 0) {
			console.log(
				`CLITEST: \n⚠️  Sample Errors (showing first ${errors.length}):`,
			);
			errors.forEach((err) => console.log(`CLITEST:    ${err}`));
		}

		// Query database after benchmark
		await queryInsertedRecords();

		console.log("CLITEST: \n✓ Benchmark complete!");
	} catch (error) {
		console.error("CLITEST: \n❌ Error:", error);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("CLITEST:", err);
	process.exit(1);
});
