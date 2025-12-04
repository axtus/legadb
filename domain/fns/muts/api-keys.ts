import { randomBytes } from "crypto";
import { prisma } from "@/prisma/prisma-client";
import { encryptApiKey } from "@/utilities/encryption";

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
	return randomBytes(32).toString("hex");
}

export type CreateApiKeyParams = {
	name: string;
	ledgerId?: number | null;
	description?: string | null;
	permissions?: object;
	expiresInDays?: number | null;
};

export type CreateApiKeyResult = {
	id: string;
	key: string;
	name: string;
	ledgerId: number | null;
	description: string | null;
	permissions: object;
	expiresAt: Date | null;
	createdAt: Date;
};

/**
 * Create a new API key
 * @param params - API key creation parameters
 * @returns The created API key with the plain key value (only time it's returned in plain)
 */
export async function createApiKey(
	params: CreateApiKeyParams,
): Promise<CreateApiKeyResult> {
	const plainKey = generateApiKey();
	const id = randomBytes(16).toString("hex");

	// Encrypt the API key before storing
	const { encrypted, keyVersion } = await encryptApiKey(plainKey);

	let expiresAt: Date | null = null;
	if (params.expiresInDays) {
		expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + params.expiresInDays);
	}

	const apiKey = await prisma.apiKey.create({
		data: {
			id,
			key: encrypted,
			keyVersion,
			name: params.name,
			ledgerId: params.ledgerId ?? null,
			description: params.description ?? null,
			permissions: params.permissions ?? {},
			expiresAt,
		},
	});

	return {
		id: apiKey.id,
		key: plainKey, // Return the plain key only at creation time
		name: apiKey.name,
		ledgerId: apiKey.ledgerId,
		description: apiKey.description,
		permissions: apiKey.permissions as object,
		expiresAt: apiKey.expiresAt,
		createdAt: apiKey.createdAt,
	};
}

/**
 * Revoke an API key by marking it as deactivated
 * @param keyId - The API key ID to revoke
 */
export async function revokeApiKey(keyId: string): Promise<void> {
	await prisma.apiKey.update({
		where: { id: keyId },
		data: {
			deActivatedAt: new Date(),
		},
	});
}

/**
 * Update the last used timestamp for an API key
 * @param keyId - The API key ID
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
	// Fire and forget - don't wait for this to complete
	prisma.apiKey
		.update({
			where: { id: keyId },
			data: {
				lastUsedAt: new Date(),
			},
		})
		.catch(() => {
			// Silently ignore errors - this is not critical
		});
}
