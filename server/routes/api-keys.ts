import {
	createApiKey,
	type CreateApiKeyParams,
	revokeApiKey,
} from "@/domain/fns/muts/api-keys";
import { listApiKeys } from "@/domain/fns/reads/api-keys";
import { getLogContext, logger } from "@/domain/utils/log-util";
import { isKnownError, KnownError } from "@/domain/utils/errors";
import { requireSessionAuth } from "@/utilities/auth-middleware";
import {
	CBORErrorResponse,
	CBORResponse,
	parseCBORRequest,
} from "@/domain/utils/request";
import { type } from "arktype";
import { prepareArkTypeErrors } from "@/domain/utils/arktype";

/**
 * Get HTTP status code from error
 */
function getErrorStatus(error: Error): number {
	if (isKnownError(error)) {
		return error.httpCode;
	}
	return 500;
}

async function handlePost(req: Request) {
	const logger = await getLogContext({
		route: "api-keys.post",
	});
	try {
		const reqBody = await parseCBORRequest(req);
		const validator = type({
			name: "string",
			ledgerId: "number.integer?",
			description: "string?",
			permissions: "object",
			expiresInDays: "number.integer?",
		});

		const body = validator(reqBody);
		if (body instanceof type.errors) {
			logger.error({
				message: "arktype validation failed",
				cause: prepareArkTypeErrors(body),
			});
			return CBORErrorResponse("Invalid request body", { status: 400 });
		}

		const params: CreateApiKeyParams = {
			name: body.name,
			ledgerId: body.ledgerId ?? null,
			description: body.description ?? null,
			permissions: body.permissions ?? {},
			expiresInDays: body.expiresInDays ?? null,
		};

		await createApiKey(params);

		return CBORResponse("ok", { status: 201 });
	} catch (err) {
		if (err instanceof Error) {
			const status = getErrorStatus(err);
			return CBORErrorResponse(err.message, { status });
		}
		logger.error(err as Error);
		return CBORErrorResponse("Failed to create API key", { status: 500 });
	}
}

async function handleGet(req: Request) {
	try {
		const url = new URL(req.url);
		const skipParam = Number(url.searchParams.get("skip"));
		const takeParam = Number(url.searchParams.get("take"));

		const skip = skipParam || 0;
		const take = takeParam || 100;

		const apiKeys = await listApiKeys(skip, take);
		return CBORResponse(apiKeys);
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

async function handleDelete(req: Request) {
	try {
		const url = new URL(req.url);
		const keyId = url.searchParams.get("id");

		if (!keyId) {
			return CBORErrorResponse("Missing required parameter: id", {
				status: 400,
			});
		}

		await revokeApiKey(keyId);
		return CBORResponse({ success: true });
	} catch (err) {
		if (err instanceof KnownError) {
			return CBORErrorResponse(err.message, { status: err.httpCode });
		}
		logger.error(err as Error);
		return CBORErrorResponse("Failed to revoke API key", { status: 500 });
	}
}

export const POST = requireSessionAuth(handlePost);
export const GET = requireSessionAuth(handleGet);
export const DELETE = requireSessionAuth(handleDelete);
