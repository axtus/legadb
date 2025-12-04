import {
	createCurrency,
	deleteCurrency,
	importCurrencies,
} from "@/domain/fns/muts/currencies";
import {
	getCurrency,
	getCurrencyUsage,
	listCurrencies,
} from "@/domain/fns/reads/currencies";
import { CURRENCY_ARRAY } from "@/domain/utils/currencies";
import { logger } from "@/domain/utils/log-util";
import { type AuthContext, requireAuth } from "@/utilities/auth-middleware";
import {
	CBORErrorResponse,
	CBORResponse,
	parseCBORRequest,
} from "@/domain/utils/request";
import { type } from "arktype";
import { arkThrow } from "@/domain/utils/arktype";
import { orPlural } from "@/domain/utils/strings";

const ImportCurrenciesValidator = type({
	codes: "string[]",
});

const CreateCurrencyValidator = type({
	code: "string>=1 & string<=5",
	name: "string>=1",
	symbol: "string>=1 & string<=3",
	minorUnits: "number.integer>=0",
});

async function handleGet(req: Request, _authContext: AuthContext) {
	try {
		const url = new URL(req.url);
		const code = url.searchParams.get("code");
		const skipParam = url.searchParams.get("skip");
		const takeParam = url.searchParams.get("take");
		const available = url.searchParams.get("available");

		// Return available currencies from the utility array (not yet in DB)
		if (available === "true") {
			const existingCurrencies = await listCurrencies(0, 1000);
			const existingCodes = new Set(existingCurrencies.map((c) => c.code));
			const availableCurrencies = CURRENCY_ARRAY.filter(
				(c) => !existingCodes.has(c.code),
			).map((c) => ({
				code: c.code,
				name: c.name,
				symbol: c.symbol,
			}));
			return CBORResponse(availableCurrencies);
		}

		if (code) {
			const currency = await getCurrency(code);
			if (!currency) {
				return CBORErrorResponse("Currency not found", { status: 404 });
			}
			const usage = await getCurrencyUsage(code);
			return CBORResponse({
				...currency,
				inUse: usage > 0,
				accountCount: usage,
			});
		}

		const skip = skipParam ? Number(skipParam) : 0;
		const take = takeParam ? Number(takeParam) : 100;

		const currencies = await listCurrencies(skip, take);

		// Add usage info to each currency
		const currenciesWithUsage = await Promise.all(
			currencies.map(async (c) => {
				const usage = await getCurrencyUsage(c.code);
				return { ...c, inUse: usage > 0, accountCount: usage };
			}),
		);

		return CBORResponse(currenciesWithUsage);
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

async function handlePost(req: Request, _authContext: AuthContext) {
	try {
		const url = new URL(req.url);
		const action = url.searchParams.get("action");

		// Handle import action
		if (action === "import") {
			const reqBody = (await parseCBORRequest(req)) as any;
			const body = arkThrow(ImportCurrenciesValidator(reqBody));
			const result = await importCurrencies(body.codes);
			return CBORResponse(result, { status: 201 });
		}

		// Handle create action
		const reqBody = (await parseCBORRequest(req)) as any;
		const body = arkThrow(CreateCurrencyValidator(reqBody));

		await createCurrency({
			code: body.code.toUpperCase(),
			name: body.name,
			symbol: body.symbol,
			minorUnits: body.minorUnits,
		});

		return CBORResponse("ok", { status: 201 });
	} catch (err) {
		logger.error(err as Error);
		if ((err as Error).message?.includes("Unique constraint")) {
			return CBORErrorResponse("Currency with this code already exists", {
				status: 409,
			});
		}
		return CBORErrorResponse("Failed to create currency", { status: 500 });
	}
}

async function handleDelete(req: Request, _authContext: AuthContext) {
	try {
		const url = new URL(req.url);
		const code = url.searchParams.get("code");

		if (!code) {
			return CBORErrorResponse("Missing required parameter: code", {
				status: 400,
			});
		}

		// Check if currency exists
		const currency = await getCurrency(code);
		if (!currency) {
			return CBORErrorResponse("Currency not found", { status: 404 });
		}

		// Check if currency is in use
		const usage = await getCurrencyUsage(code);
		if (usage > 0) {
			return CBORErrorResponse(
				`Cannot delete currency: it is used by ${usage} ${
					orPlural(usage, "account", "accounts")
				}`,
				{ status: 409 },
			);
		}

		await deleteCurrency(code);
		return CBORResponse({ success: true });
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Failed to delete currency", { status: 500 });
	}
}

export const GET = requireAuth(handleGet);
export const POST = requireAuth(handlePost);
export const DELETE = requireAuth(handleDelete);
