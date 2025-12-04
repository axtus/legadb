import { getPG } from "@/domain/db/postgres";

type AuthSessionRow = {
	id: string;
	token: string;
	identity_id: string;
	expires_at: Date;
	created_at: Date;
	updated_at: Date;
};

/**
 * Validate a session token and return the identity ID if valid
 * @param token - The session token to validate
 * @returns The identity ID if valid, null if invalid or expired
 */
export async function validateSession(token: string): Promise<string | null> {
	const pg = getPG();
	const results = await pg<AuthSessionRow[]>`
		SELECT 
			id,
			token,
			identity_id,
			expires_at,
			created_at,
			updated_at
		FROM auth_sessions
		WHERE token = ${token}
	`;

	if (results.length === 0) {
		return null;
	}

	const session = results[0];
	if (session.expires_at < new Date()) {
		return null;
	}

	return session.identity_id;
}
