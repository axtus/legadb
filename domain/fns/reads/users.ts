import { getPG } from "@/domain/db/postgres";

export type SystemRole = "ADMIN" | "USER";

export type UserWithoutPassword = {
	id: string;
	username: string;
	systemRole: SystemRole;
	disabledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

type AuthIdentityRow = {
	id: string;
	username: string;
	system_role: string;
	disabled_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

function convertUserRow(row: AuthIdentityRow): UserWithoutPassword {
	return {
		id: row.id,
		username: row.username,
		systemRole: row.system_role as SystemRole,
		disabledAt: row.disabled_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * List users with pagination
 * Returns array of AuthIdentity excluding passwordHash field
 */
export async function listUsers(
	skip: number = 0,
	take: number = 100,
): Promise<UserWithoutPassword[]> {
	const pg = getPG();
	const results = await pg<AuthIdentityRow[]>`
		SELECT 
			id,
			username,
			system_role,
			disabled_at,
			created_at,
			updated_at
		FROM auth_identities
		ORDER BY created_at DESC
		LIMIT ${take}
		OFFSET ${skip}
	`;

	return results.map(convertUserRow);
}

/**
 * Get user by ID
 * Returns AuthIdentity excluding passwordHash, or null if not found
 */
export async function getUserById(
	id: string,
): Promise<UserWithoutPassword | null> {
	const pg = getPG();
	const results = await pg<AuthIdentityRow[]>`
		SELECT 
			id,
			username,
			system_role,
			disabled_at,
			created_at,
			updated_at
		FROM auth_identities
		WHERE id = ${id}
	`;

	if (results.length === 0) return null;
	return convertUserRow(results[0]);
}

/**
 * Get user by username
 * Returns AuthIdentity excluding passwordHash, or null if not found
 */
export async function getUserByUsername(
	username: string,
): Promise<UserWithoutPassword | null> {
	const pg = getPG();
	const results = await pg<AuthIdentityRow[]>`
		SELECT 
			id,
			username,
			system_role,
			disabled_at,
			created_at,
			updated_at
		FROM auth_identities
		WHERE username = ${username}
	`;

	if (results.length === 0) return null;
	return convertUserRow(results[0]);
}
