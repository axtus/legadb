import { prisma } from "@/prisma/prisma-client";
import { hashPassword } from "@/utilities/password";
import { KnownError } from "@/domain/utils/errors";
import { getPG } from "@/domain/db/postgres";
import type { SystemRole } from "@/domain/fns/reads/users";

export type CreateUserResult = {
	id: string;
	username: string;
	systemRole: SystemRole;
	disabledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Create a new user identity
 * Validates username (alpha only, > 5 chars) and password (min 8 chars)
 * Returns AuthIdentity without passwordHash, or Error on failure
 */
export async function createUser(
	username: string,
	password: string,
	systemRole: SystemRole = "USER",
): Promise<CreateUserResult | Error> {
	// Validate username: alpha only, > 5 characters
	const usernameRegex = /^[a-zA-Z]{6,}$/;
	if (!usernameRegex.test(username)) {
		return new KnownError(
			"Username must contain only alphabetic characters and be at least 6 characters long",
		);
	}

	// Validate password: minimum 8 characters
	if (password.length < 8) {
		return new KnownError("Password must be at least 8 characters long");
	}

	// Check for duplicate username
	const pg = getPG();
	const existingUserResults = await pg<{ id: string }[]>`
		SELECT id
		FROM auth_identities
		WHERE username = ${username}
	`;

	if (existingUserResults.length > 0) {
		return new KnownError("Username already exists");
	}

	// Hash password
	const passwordHash = await hashPassword(password);

	// Create user with generated UUID
	const user = await prisma.authIdentity.create({
		data: {
			id: Bun.randomUUIDv7(),
			username,
			passwordHash,
			systemRole,
		},
		select: {
			id: true,
			username: true,
			systemRole: true,
			disabledAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return user;
}

/**
 * Disable a user by setting disabledAt timestamp
 */
export async function disableUser(userId: string): Promise<void | Error> {
	const pg = getPG();
	const existingResults = await pg<{ id: string }[]>`
		SELECT id FROM auth_identities WHERE id = ${userId}
	`;

	if (existingResults.length === 0) {
		return new KnownError("User not found");
	}

	await prisma.authIdentity.update({
		where: { id: userId },
		data: { disabledAt: new Date() },
	});
}

/**
 * Enable a user by clearing disabledAt timestamp
 */
export async function enableUser(userId: string): Promise<void | Error> {
	const pg = getPG();
	const existingResults = await pg<{ id: string }[]>`
		SELECT id FROM auth_identities WHERE id = ${userId}
	`;

	if (existingResults.length === 0) {
		return new KnownError("User not found");
	}

	await prisma.authIdentity.update({
		where: { id: userId },
		data: { disabledAt: null },
	});
}

/**
 * Update a user's system role
 */
export async function updateUserRole(
	userId: string,
	systemRole: SystemRole,
): Promise<void | Error> {
	const pg = getPG();
	const existingResults = await pg<{ id: string }[]>`
		SELECT id FROM auth_identities WHERE id = ${userId}
	`;

	if (existingResults.length === 0) {
		return new KnownError("User not found");
	}

	await prisma.authIdentity.update({
		where: { id: userId },
		data: { systemRole },
	});
}
