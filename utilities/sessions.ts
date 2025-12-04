import { randomBytes } from "crypto";
import { prisma } from "../prisma/prisma-client";

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
	return randomBytes(32).toString("hex");
}

/**
 * Create a new session for an identity
 * @param identityId - The identity ID to create a session for
 * @param expiresInDays - Number of days until session expires (default: 30)
 * @returns The session token
 */
export async function createSession(
	identityId: string,
	expiresInDays: number = 30,
): Promise<string> {
	const token = generateSessionToken();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	await prisma.authSession.create({
		data: {
			token,
			identityId,
			expiresAt,
		},
	});

	return token;
}

/**
 * Validate a session token and return the identity ID if valid
 * @param token - The session token to validate
 * @returns The identity ID if valid, null if invalid or expired
 */
export async function validateSession(token: string): Promise<string | null> {
	const session = await prisma.authSession.findUnique({
		where: { token },
	});

	if (!session) {
		return null;
	}

	if (session.expiresAt < new Date()) {
		return null;
	}

	return session.identityId;
}

/**
 * Delete a session by token
 * @param token - The session token to delete
 */
export async function deleteSession(token: string): Promise<void> {
	await prisma.authSession.deleteMany({
		where: { token },
	});
}

/**
 * Delete all sessions for an identity
 * @param identityId - The identity ID to delete all sessions for
 */
export async function deleteAllSessions(identityId: string): Promise<void> {
	await prisma.authSession.deleteMany({
		where: { identityId },
	});
}
