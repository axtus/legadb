import { prisma } from "@/prisma/prisma-client";
import { hashPassword, verifyPassword } from "@/utilities/password";
import { createSession } from "@/domain/fns/muts/sessions";
import { validateSession } from "@/domain/fns/reads/sessions";
import { Error401, KnownError } from "@/domain/utils/errors";
import { getPG } from "@/domain/db/postgres";
import { getLogContext } from "@/domain/utils/log-util";
import type { SystemRole } from "@/domain/fns/reads/users";

type AuthIdentityWithPasswordRow = {
	id: string;
	username: string;
	password_hash: string;
	system_role: string;
	disabled_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

export type LoginResult = {
	token: string;
	identityId: string;
	systemRole: SystemRole;
};

/**
 * Login with username and password
 * Returns session token on success, Error on failure
 */
export async function login(
	username: string,
	password: string,
): Promise<LoginResult | Error> {
	if (!username || !password) {
		return new Error401("Username and password are required");
	}

	const pg = getPG();
	const results = await pg<AuthIdentityWithPasswordRow[]>`
		SELECT 
			id,
			username,
			password_hash,
			system_role,
			disabled_at,
			created_at,
			updated_at
		FROM auth_identities
		WHERE username = ${username}
	`;

	if (results.length === 0) {
		return new Error401("Invalid username or password");
	}

	const identity = results[0];

	// Check if user is disabled
	if (identity.disabled_at !== null) {
		return new Error401("Account is disabled");
	}

	const isValid = await verifyPassword(password, identity.password_hash);
	if (!isValid) {
		return new Error401("Invalid username or password");
	}

	const token = await createSession(identity.id);
	return {
		token,
		identityId: identity.id,
		systemRole: identity.system_role as SystemRole,
	};
}

/**
 * Logout by deleting a session
 */
export async function logout(sessionToken: string): Promise<void | Error> {
	const logger = await getLogContext({ sessionToken, method: "logout" });
	if (!sessionToken) {
		return new Error401("Session token is required");
	}
	prisma.authSession.update({
		where: {
			token: sessionToken,
		},
		data: {
			expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
		},
	}).then(() => {
		logger.info("Session logged out successfully");
	});
	return undefined;
}

/**
 * Change password for an identity
 * Verifies old password, hashes new password, updates identity, and logs to history
 */
export async function changePassword(
	identityId: string,
	oldPassword: string,
	newPassword: string,
): Promise<void | Error> {
	if (!oldPassword || !newPassword) {
		return new KnownError("Old password and new password are required");
	}

	const pg = getPG();
	const results = await pg<AuthIdentityWithPasswordRow[]>`
		SELECT 
			id,
			username,
			password_hash,
			created_at,
			updated_at
		FROM auth_identities
		WHERE id = ${identityId}
	`;

	if (results.length === 0) {
		return new KnownError("Identity not found");
	}

	const identity = results[0];
	const isValid = await verifyPassword(oldPassword, identity.password_hash);
	if (!isValid) {
		return new Error401("Invalid old password");
	}

	const newPasswordHash = await hashPassword(newPassword);

	// Update password and log to history in a transaction
	await prisma.$transaction([
		prisma.authIdentity.update({
			where: { id: identityId },
			data: { passwordHash: newPasswordHash },
		}),
		prisma.authPasswordHistory.create({
			data: {
				identityId,
				passwordHash: newPasswordHash,
			},
		}),
	]);

	return undefined;
}

/**
 * Admin change password for an identity
 * Admin can change password without knowing the old password
 * Admin cannot change their own password via this method
 */
export async function adminChangePassword(
	adminSessionToken: string,
	targetIdentityId: string,
	newPassword: string,
): Promise<void | Error> {
	if (!adminSessionToken || !targetIdentityId || !newPassword) {
		return new KnownError(
			"Admin session token, target identity ID, and new password are required",
		);
	}

	// Validate admin session
	const adminIdentityId = await validateSession(adminSessionToken);
	if (!adminIdentityId) {
		return new Error401("Invalid or expired admin session");
	}

	// Prevent admin from changing their own password
	if (adminIdentityId === targetIdentityId) {
		return new KnownError(
			"Admin cannot change their own password via this method",
		);
	}

	// Verify target identity exists
	const pg = getPG();
	const identityResults = await pg<{ id: string }[]>`
		SELECT id
		FROM auth_identities
		WHERE id = ${targetIdentityId}
	`;

	if (identityResults.length === 0) {
		return new KnownError("Target identity not found");
	}

	const newPasswordHash = await hashPassword(newPassword);

	// Update password and log to history in a transaction
	await prisma.$transaction([
		prisma.authIdentity.update({
			where: { id: targetIdentityId },
			data: { passwordHash: newPasswordHash },
		}),
		prisma.authPasswordHistory.create({
			data: {
				identityId: targetIdentityId,
				passwordHash: newPasswordHash,
			},
		}),
	]);

	return undefined;
}
