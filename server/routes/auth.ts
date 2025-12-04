import {
	adminChangePassword,
	changePassword,
	login,
	logout,
} from "@/domain/fns/biz-logic/auth";
import { logger } from "@/domain/utils/log-util";
import { Error401, isKnownError } from "@/domain/utils/errors";
import { validateSession } from "@/domain/fns/reads/sessions";
import { prisma } from "@/prisma/prisma-client";
import {
	CBORErrorResponse,
	CBORResponse,
	parseCBORRequest,
} from "@/domain/utils/request";
import { type } from "arktype";
import { arkThrow } from "@/domain/utils/arktype";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Get HTTP status code from error
 */
function getErrorStatus(error: Error): number {
	if (isKnownError(error)) {
		return error.httpCode;
	}
	if (error instanceof Error401) {
		return 401;
	}
	return 500;
}

/**
 * Extract session cookie from request
 */
function getSessionCookie(
	req: Request,
): { token: string; identityId: string } | null {
	const cookieHeader = req.headers.get("Cookie");
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const sessionCookie = cookies.find((c) => c.startsWith("gledger_session="));

	if (!sessionCookie) return null;

	const value = sessionCookie.split("=")[1];
	if (!value) return null;

	const [token, identityId] = value.split(":");
	if (!token || !identityId) return null;

	return { token, identityId };
}

const AuthRequestActionValidator = type(
	'"login" | "logout" | "changePassword" | "admin.changePassword"',
);
const AuthRequestPayloadValidator = type({
	username: "string?",
	password: "string?",
	sessionToken: "string?",
	identityId: "string?",
	oldPassword: "string?",
	newPassword: "string?",
	adminSessionToken: "string?",
	targetIdentityId: "string?",
});

export async function POST(req: Request) {
	try {
		const reqBody = await parseCBORRequest(req) as any;
		const body = {
			action: arkThrow(AuthRequestActionValidator(reqBody?.action)),
			payload: arkThrow(AuthRequestPayloadValidator(reqBody?.payload)),
		};
		switch (body.action) {
			case "login": {
				const { username, password } = body.payload || {};
				if (!username || !password) {
					return CBORErrorResponse("Username and password are required", {
						status: 400,
					});
				}

				const result = await login(username, password);
				if (result instanceof Error) {
					const status = getErrorStatus(result);
					return CBORErrorResponse(result.message, { status });
				}

				// Set HTTP-only cookie for session token
				const cookieValue = `${result.token}:${result.identityId}`;
				const expiresDate = new Date();
				expiresDate.setDate(expiresDate.getDate() + 30); // 30 days
				const secureFlag = isProduction ? "Secure; " : "";

				return CBORResponse(
					{
						token: result.token,
						identityId: result.identityId,
						systemRole: result.systemRole,
					},
					{
						headers: {
							"Set-Cookie":
								`gledger_session=${cookieValue}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Expires=${expiresDate.toUTCString()}`,
						},
					},
				);
			}

			case "logout": {
				const { sessionToken } = body.payload || {};
				if (!sessionToken) {
					return CBORErrorResponse("Session token is required", {
						status: 400,
					});
				}

				const result = await logout(sessionToken);
				if (result instanceof Error) {
					const status = getErrorStatus(result);
					return CBORErrorResponse(result.message, { status });
				}

				// Clear the session cookie
				const secureFlag = isProduction ? "Secure; " : "";
				return CBORResponse(
					{ success: true },
					{
						headers: {
							"Set-Cookie":
								`gledger_session=; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
						},
					},
				);
			}

			case "changePassword": {
				const { identityId, oldPassword, newPassword } = body.payload || {};
				if (!identityId || !oldPassword || !newPassword) {
					return CBORErrorResponse(
						"Identity ID, old password, and new password are required",
						{ status: 400 },
					);
				}

				const result = await changePassword(
					identityId,
					oldPassword,
					newPassword,
				);
				if (result instanceof Error) {
					const status = getErrorStatus(result);
					return CBORErrorResponse(result.message, { status });
				}

				return CBORResponse({ success: true });
			}

			case "admin.changePassword": {
				const { adminSessionToken, targetIdentityId, newPassword } =
					body.payload || {};
				if (!adminSessionToken || !targetIdentityId || !newPassword) {
					return CBORErrorResponse(
						"Admin session token, target identity ID, and new password are required",
						{ status: 400 },
					);
				}

				const result = await adminChangePassword(
					adminSessionToken,
					targetIdentityId,
					newPassword,
				);
				if (result instanceof Error) {
					const status = getErrorStatus(result);
					return CBORErrorResponse(result.message, { status });
				}

				return CBORResponse({ success: true });
			}

			default: {
				return CBORErrorResponse(`Unknown action: ${body.action}`, {
					status: 400,
				});
			}
		}
	} catch (err) {
		if (err instanceof Error) {
			if (isKnownError(err) || err instanceof Error401) {
				const status = getErrorStatus(err);
				return CBORErrorResponse(err.message, { status });
			}
		}

		logger.error({
			message: "Auth request failed",
			cause: {
				method: "auth",
				error: err instanceof Error ? err.message : String(err),
			},
		});

		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		if (url.pathname !== "/auth/session") {
			return CBORErrorResponse("Not found", { status: 404 });
		}

		const sessionCookie = getSessionCookie(req);
		if (!sessionCookie) {
			return CBORErrorResponse("No session found", { status: 401 });
		}

		const { token, identityId } = sessionCookie;

		// Validate session token
		const validatedIdentityId = await validateSession(token);
		if (!validatedIdentityId || validatedIdentityId !== identityId) {
			return CBORErrorResponse("Invalid or expired session", { status: 401 });
		}

		// Get full session details
		const session = await prisma.authSession.findUnique({
			where: { token },
			select: {
				token: true,
				identityId: true,
				expiresAt: true,
				createdAt: true,
			},
		});

		if (!session) {
			return CBORErrorResponse("Session not found", { status: 401 });
		}

		return CBORResponse({
			token: session.token,
			identityId: session.identityId,
			expiresAt: session.expiresAt.toISOString(),
			createdAt: session.createdAt.toISOString(),
		});
	} catch (err) {
		if (err instanceof Error) {
			if (isKnownError(err) || err instanceof Error401) {
				const status = getErrorStatus(err);
				return CBORErrorResponse(err.message, { status });
			}
		}

		logger.error({
			message: "Get session failed",
			cause: {
				method: "auth/session",
				error: err instanceof Error ? err.message : String(err),
			},
		});

		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}
