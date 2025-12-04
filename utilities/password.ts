/**
 * Hash a password using Bun's built-in password hashing
 * Uses Argon2id algorithm by default
 */
export async function hashPassword(password: string): Promise<string> {
	return await Bun.password.hash(password);
}

/**
 * Verify a password against a hash
 * Automatically detects the algorithm from the hash
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return await Bun.password.verify(password, hash);
}
