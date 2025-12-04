import { createAccount } from "@/domain/fns/muts/muts";
import { getAccount, listAccounts } from "@/domain/fns/reads/reads";
import { getCurrency } from "@/domain/fns/reads/currencies";
import { prepareArkTypeErrors } from "@/domain/utils/arktype";
import { parseDecimal, validateDecimalPlaces } from "@/domain/utils/decimal";
import { getLogContext, logger } from "@/domain/utils/log-util";
import {
	CBORErrorResponse,
	CBORResponse,
	parseCBORRequest,
} from "@/domain/utils/request";
import { type AuthContext, requireAuth } from "@/utilities/auth-middleware";
import { type } from "arktype";

async function handleGet(req: Request, _authContext: AuthContext) {
	try {
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		const skipParam = url.searchParams.get("skip");
		const takeParam = url.searchParams.get("take");

		if (id) {
			const account = await getAccount(BigInt(id));
			if (!account) {
				return CBORErrorResponse("Account not found", { status: 404 });
			}

			return CBORResponse(account);
		}

		const skip = skipParam ? Number(skipParam) : 0;
		const take = takeParam ? Number(takeParam) : 100;

		const accounts = await listAccounts(skip, take);
		return CBORResponse(accounts);
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

async function handlePost(req: Request, _authContext: AuthContext) {
	const logger = await getLogContext({
		route: "accounts.post",
	});
	try {
		const reqBody = await parseCBORRequest(req);
		const validator = type({
			id: "number.integer",
			ledgerId: "number.integer",
			externalId: "string?",
			currencyCode: "string",
			balanceType: "'CREDIT' | 'DEBIT'",
			minimumBalance: "string",
			maximumBalance: "string?",
		});

		const body = validator(reqBody);
		if (body instanceof type.errors) {
			logger.error({
				message: "arktype validation failed",
				cause: prepareArkTypeErrors(body),
			});
			return CBORErrorResponse("Invalid request body", { status: 400 });
		}

		// Get currency to validate minorUnits
		const currency = await getCurrency(body.currencyCode);
		if (!currency) {
			return CBORErrorResponse(
				`Currency ${body.currencyCode} not found`,
				{ status: 400 },
			);
		}

		// Parse and validate minimumBalance
		const minimumBalance = parseDecimal(body.minimumBalance);
		if (!validateDecimalPlaces(minimumBalance, currency.minor_units)) {
			return CBORErrorResponse(
				`minimumBalance has more than ${currency.minor_units} decimal places for currency ${currency.code}`,
				{ status: 400 },
			);
		}

		// Parse and validate maximumBalance if provided
		let maximumBalance: typeof minimumBalance | null = null;
		if (body.maximumBalance !== undefined && body.maximumBalance !== null) {
			maximumBalance = parseDecimal(body.maximumBalance);
			if (!validateDecimalPlaces(maximumBalance, currency.minor_units)) {
				return CBORErrorResponse(
					`maximumBalance has more than ${currency.minor_units} decimal places for currency ${currency.code}`,
					{ status: 400 },
				);
			}
		}

		await createAccount({
			id: BigInt(body.id),
			ledgerId: body.ledgerId,
			externalId: body.externalId || undefined,
			currencyCode: body.currencyCode,
			balanceType: body.balanceType,
			minimumBalance,
			maximumBalance,
		});

		return CBORResponse("ok", { status: 201 });
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Failed to create account", { status: 500 });
	}
}

export const GET = requireAuth(handleGet);
export const POST = requireAuth(handlePost);
