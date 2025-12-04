import { getPG } from "@/domain/db/postgres";
import { decryptApiKey } from "@/utilities/encryption";

type ApiKeyRow = {
	id: string;
	key: string;
	key_version: number;
	name: string;
	ledger_id: number | null;
	description: string | null;
	permissions: object;
	deactivated_at: Date | null;
	expires_at: Date | null;
	last_used_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

export type ApiKeyContext = {
	id: string;
	ledgerId: number | null;
	permissions: object;
	name: string;
};

/**
 * Validate an API key and return context if valid
 * @param key - The plain API key to validate
 * @returns API key context if valid, null if invalid, expired, or deactivated
 */
export async function validateApiKey(
	key: string,
): Promise<
	{
		id: string;
		ledgerId: number | null;
		permissions: object;
		name: string;
	} | null
> {
	if (!key) {
		return null;
	}

	const pg = getPG();

	// Get all active API keys and check by decrypting
	const results = await pg<ApiKeyRow[]>`
		SELECT 
			id,
			key,
			key_version,
			name,
			ledger_id,
			description,
			permissions,
			deactivated_at,
			expires_at,
			last_used_at,
			created_at,
			updated_at
		FROM api_keys
		WHERE deactivated_at IS NULL
		AND (expires_at IS NULL OR expires_at > NOW())
	`;

	for (const apiKey of results) {
		try {
			const decryptedKey = await decryptApiKey(apiKey.key, apiKey.key_version);
			if (decryptedKey === key) {
				return {
					id: apiKey.id,
					ledgerId: apiKey.ledger_id,
					permissions: apiKey.permissions,
					name: apiKey.name,
				};
			}
		} catch {
			// Skip keys that fail to decrypt
			continue;
		}
	}

	return null;
}

export type ApiKeyDetails = {
	id: string;
	key: string; // Decrypted key
	name: string;
	ledgerId: number | null;
	description: string | null;
	permissions: Record<string, boolean>;
	deactivatedAt: Date | null;
	expiresAt: Date | null;
	lastUsedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Get API key details by ID (includes decrypted key)
 * @param keyId - The API key ID
 * @returns API key details with decrypted key, or null if not found
 */
export async function getApiKey(keyId: string): Promise<ApiKeyDetails | null> {
	const pg = getPG();
	const results = await pg<ApiKeyRow[]>`
		SELECT 
			id,
			key,
			key_version,
			name,
			ledger_id,
			description,
			permissions,
			deactivated_at,
			expires_at,
			last_used_at,
			created_at,
			updated_at
		FROM api_keys
		WHERE id = ${keyId}
	`;

	if (results.length === 0) {
		return null;
	}

	const row = results[0];
	const decryptedKey = await decryptApiKey(row.key, row.key_version);

	return {
		id: row.id,
		key: decryptedKey,
		name: row.name,
		ledgerId: row.ledger_id,
		description: row.description,
		permissions: row.permissions as Record<string, boolean>,
		deactivatedAt: row.deactivated_at,
		expiresAt: row.expires_at,
		lastUsedAt: row.last_used_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * List API keys with decrypted key values
 * @param skip - Number of records to skip
 * @param take - Number of records to take
 * @returns List of API keys with decrypted keys
 */
export async function listApiKeys(
	skip: number = 0,
	take: number = 100,
): Promise<ApiKeyDetails[]> {
	const pg = getPG();
	const results = await pg<ApiKeyRow[]>`
		SELECT 
			id,
			key,
			key_version,
			name,
			ledger_id,
			description,
			permissions,
			deactivated_at,
			expires_at,
			last_used_at,
			created_at,
			updated_at
		FROM api_keys
		ORDER BY created_at DESC
		LIMIT ${take}
		OFFSET ${skip}
	`;

	const apiKeys: ApiKeyDetails[] = [];
	for (const row of results) {
		try {
			const decryptedKey = await decryptApiKey(row.key, row.key_version);
			apiKeys.push({
				id: row.id,
				key: decryptedKey,
				name: row.name,
				ledgerId: row.ledger_id,
				description: row.description,
				permissions: row.permissions as Record<string, boolean>,
				deactivatedAt: row.deactivated_at,
				expiresAt: row.expires_at,
				lastUsedAt: row.last_used_at,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch {
			// Skip keys that fail to decrypt
			continue;
		}
	}

	return apiKeys;
}
