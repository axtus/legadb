import { validateSession } from "@/domain/fns/reads/sessions";
import { validateApiKey } from "@/domain/fns/reads/api-keys";
import { updateApiKeyLastUsed } from "@/domain/fns/muts/api-keys";

export type AuthContext = {
	identityId?: string;
	ledgerId?: number | null;
	authMethod: "session" | "apikey";
	apiKeyId?: string;
	apiKeyName?: string;
	permissions?: object;
};

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

/**
 * Extract API key from Authorization header
 */
function getApiKeyFromHeader(req: Request): string | null {
	return req.headers.get("x-auth-token");
}

/**
 * Extract and validate authentication context from request
 * Supports both session-based auth (cookies) and API key auth (Authorization header)
 * @param req - The request to extract auth from
 * @returns Auth context if valid, null if no valid auth found
 */
export async function extractAuthContext(
	req: Request,
): Promise<
	{
		identityId?: string;
		ledgerId?: number | null;
		authMethod: "session" | "apikey";
		apiKeyId?: string;
		apiKeyName?: string;
		permissions?: object;
	} | null
> {
	// Try session-based auth first (cookie)
	const sessionCookie = getSessionCookie(req);
	if (sessionCookie) {
		const identityId = await validateSession(sessionCookie.token);
		if (identityId && identityId === sessionCookie.identityId) {
			return {
				identityId,
				authMethod: "session",
			};
		}
	}

	// Try API key auth (Authorization header)
	const apiKey = getApiKeyFromHeader(req);
	if (apiKey) {
		const apiKeyContext = await validateApiKey(apiKey);
		if (apiKeyContext) {
			// Update last used timestamp (fire and forget)
			updateApiKeyLastUsed(apiKeyContext.id);

			return {
				ledgerId: apiKeyContext.ledgerId,
				authMethod: "apikey",
				apiKeyId: apiKeyContext.id,
				apiKeyName: apiKeyContext.name,
				permissions: apiKeyContext.permissions,
			};
		}
	}

	return null;
}

/**
 * Middleware wrapper that requires authentication
 * Extracts auth context and passes it to the handler
 * Returns 401 if no valid authentication found
 */
export function requireAuth<_T extends (...args: any[]) => Promise<Response>>(
	handler: (req: Request, authContext: AuthContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
	return async (req: Request): Promise<Response> => {
		const authContext = await extractAuthContext(req);

		if (!authContext) {
			return Response.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		return handler(req, authContext);
	};
}

/**
 * Middleware wrapper that requires session-based authentication
 * Only allows session auth, not API keys
 * Useful for sensitive operations like API key management
 */
export function requireSessionAuth(
	handler: (req: Request, authContext: AuthContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
	return async (req: Request): Promise<Response> => {
		const authContext = await extractAuthContext(req);

		if (!authContext) {
			return Response.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		if (authContext.authMethod !== "session") {
			return Response.json(
				{ error: "Session authentication required" },
				{ status: 403 },
			);
		}

		if (!authContext.identityId) {
			return Response.json(
				{ error: "Invalid session" },
				{ status: 401 },
			);
		}

		return handler(req, authContext);
	};
}
