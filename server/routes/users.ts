import {
	createUser,
	disableUser,
	enableUser,
	updateUserRole,
} from "@/domain/fns/muts/users";
import {
	getUserById,
	getUserByUsername,
	listUsers,
	type SystemRole,
} from "@/domain/fns/reads/users";
import { logger } from "@/domain/utils/log-util";
import { isKnownError, KnownError } from "@/domain/utils/errors";
import {
	type AuthContext,
	requireSessionAuth,
} from "@/utilities/auth-middleware";
import {
	CBORErrorResponse,
	CBORResponse,
	parseCBORRequest,
} from "@/domain/utils/request";
import { type } from "arktype";
import { arkThrow } from "@/domain/utils/arktype";

const CreateUserValidator = type({
	username: "string>=1",
	password: "string>=1",
	systemRole: "'admin' | 'user' | 'viewer' | undefined",
});

const UpdateUserValidator = type({
	action: '"disable" | "enable" | "updateRole"',
	userId: "string>=1",
	systemRole: "'admin' | 'user' | 'viewer' | undefined",
});

/**
 * Get HTTP status code from error
 */
function getErrorStatus(error: Error): number {
	if (isKnownError(error)) {
		return error.httpCode;
	}
	return 500;
}

async function handlePost(req: Request, _authContext: AuthContext) {
	try {
		// Parse and validate request body
		const reqBody = (await parseCBORRequest(req)) as any;
		const body = arkThrow(CreateUserValidator(reqBody));
		const { username, password, systemRole } = body;

		// Create user
		const result = await createUser(
			username,
			password,
			systemRole as SystemRole | undefined,
		);
		if (result instanceof Error) {
			const status = getErrorStatus(result);
			return CBORErrorResponse(result.message, { status });
		}

		return CBORResponse("ok", { status: 201 });
	} catch (err) {
		if (err instanceof KnownError) {
			return CBORErrorResponse(err.message, { status: err.httpCode });
		}
		logger.error(err as Error);
		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

async function handleGet(req: Request, _authContext: AuthContext) {
	try {
		// Parse query params
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		const username = url.searchParams.get("username");
		const skipParam = url.searchParams.get("skip");
		const takeParam = url.searchParams.get("take");

		// Route to appropriate read function
		if (id) {
			const user = await getUserById(id);
			if (!user) {
				return CBORErrorResponse("User not found", { status: 404 });
			}
			return CBORResponse(user);
		}

		if (username) {
			const user = await getUserByUsername(username);
			if (!user) {
				return CBORErrorResponse("User not found", { status: 404 });
			}
			return CBORResponse(user);
		}

		// List users with pagination
		const skip = skipParam ? Number(skipParam) : 0;
		const take = takeParam ? Number(takeParam) : 100;

		if (isNaN(skip) || isNaN(take) || skip < 0 || take < 0) {
			return CBORErrorResponse("Invalid pagination parameters", {
				status: 400,
			});
		}

		const users = await listUsers(skip, take);
		return CBORResponse(users);
	} catch (err) {
		if (err instanceof KnownError) {
			return CBORErrorResponse(err.message, { status: err.httpCode });
		}

		logger.error(err as Error);

		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

async function handlePatch(req: Request, _authContext: AuthContext) {
	try {
		const reqBody = (await parseCBORRequest(req)) as any;
		const body = arkThrow(UpdateUserValidator(reqBody));
		const { action, userId, systemRole } = body;

		let result: void | Error;

		switch (action) {
			case "disable":
				result = await disableUser(userId);
				break;
			case "enable":
				result = await enableUser(userId);
				break;
			case "updateRole":
				if (!systemRole) {
					return CBORErrorResponse(
						"systemRole is required for updateRole action",
						{ status: 400 },
					);
				}
				result = await updateUserRole(userId, systemRole as SystemRole);
				break;
			default:
				return CBORErrorResponse("Invalid action", { status: 400 });
		}

		if (result instanceof Error) {
			const status = getErrorStatus(result);
			return CBORErrorResponse(result.message, { status });
		}

		return CBORResponse("ok");
	} catch (err) {
		if (err instanceof KnownError) {
			return CBORErrorResponse(err.message, { status: err.httpCode });
		}
		logger.error(err as Error);
		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

export const POST = requireSessionAuth(handlePost);
export const GET = requireSessionAuth(handleGet);
export const PATCH = requireSessionAuth(handlePatch);
