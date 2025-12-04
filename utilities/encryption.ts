import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "crypto";
import { getPG } from "@/domain/db/postgres";
import { prisma } from "@/prisma/prisma-client";
import { appenv } from "@/domain/utils/env/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const _AUTH_TAG_LENGTH = 16;

type EncryptionKeyRow = {
	id: number;
	encrypted_key: string;
	created_at: Date;
	active_until: Date | null;
};

/**
 * Get the master encryption key from environment
 */
function getMasterKey(): Buffer {
	const masterKeyHex = appenv("GL_ENC_KEY");
	// Ensure 32 bytes for AES-256
	const hash = createHash("sha256").update(masterKeyHex).digest();
	return hash;
}

/**
 * Encrypt data with a given key using AES-256-GCM
 */
function encrypt(plaintext: string, key: Buffer): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(plaintext, "utf8");
	encrypted = Buffer.concat([encrypted, cipher.final()]);

	const authTag = cipher.getAuthTag();

	// Format: iv:authTag:encryptedData (all base64)
	return `${iv.toString("base64")}:${authTag.toString("base64")}:${
		encrypted.toString("base64")
	}`;
}

/**
 * Decrypt data with a given key using AES-256-GCM
 */
function decrypt(encryptedData: string, key: Buffer): string {
	const parts = encryptedData.split(":");
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted data format");
	}

	const iv = Buffer.from(parts[0], "base64");
	const authTag = Buffer.from(parts[1], "base64");
	const encrypted = Buffer.from(parts[2], "base64");

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(encrypted);
	decrypted = Buffer.concat([decrypted, decipher.final()]);

	return decrypted.toString("utf8");
}

/**
 * Generate a new child encryption key
 */
function generateChildKey(): Buffer {
	return randomBytes(32);
}

/**
 * Get the currently active encryption key from the database
 * Creates one if none exists
 */
export async function getActiveEncryptionKey(): Promise<{
	id: number;
	key: Buffer;
}> {
	const pg = getPG();

	// Find the currently active key (activeUntil is null)
	const results = await pg<EncryptionKeyRow[]>`
		SELECT id, encrypted_key, created_at, active_until
		FROM encryption_keys
		WHERE active_until IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`;

	if (results.length > 0) {
		const row = results[0];
		const masterKey = getMasterKey();
		const childKey = Buffer.from(
			decrypt(row.encrypted_key, masterKey),
			"base64",
		);
		return { id: row.id, key: childKey };
	}

	// No active key exists, create one
	return await createEncryptionKey();
}

/**
 * Get an encryption key by version ID
 */
export async function getEncryptionKeyById(
	keyVersion: number,
): Promise<Buffer> {
	const pg = getPG();

	const results = await pg<EncryptionKeyRow[]>`
		SELECT id, encrypted_key, created_at, active_until
		FROM encryption_keys
		WHERE id = ${keyVersion}
	`;

	if (results.length === 0) {
		throw new Error(`Encryption key version ${keyVersion} not found`);
	}

	const masterKey = getMasterKey();
	const childKey = Buffer.from(
		decrypt(results[0].encrypted_key, masterKey),
		"base64",
	);
	return childKey;
}

/**
 * Create a new encryption key and store it in the database
 */
export async function createEncryptionKey(): Promise<{
	id: number;
	key: Buffer;
}> {
	const masterKey = getMasterKey();
	const childKey = generateChildKey();

	// Encrypt the child key with the master key
	const encryptedChildKey = encrypt(childKey.toString("base64"), masterKey);

	// Mark any existing active keys as inactive
	await prisma.encryptionKey.updateMany({
		where: { activeUntil: null },
		data: { activeUntil: new Date() },
	});

	// Create the new key
	const newKey = await prisma.encryptionKey.create({
		data: {
			encryptedKey: encryptedChildKey,
		},
	});

	return { id: newKey.id, key: childKey };
}

/**
 * Encrypt an API key using the active encryption key
 */
export async function encryptApiKey(
	plainApiKey: string,
): Promise<{ encrypted: string; keyVersion: number }> {
	const { id, key } = await getActiveEncryptionKey();
	const encrypted = encrypt(plainApiKey, key);
	return { encrypted, keyVersion: id };
}

/**
 * Decrypt an API key using its stored key version
 */
export async function decryptApiKey(
	encryptedApiKey: string,
	keyVersion: number,
): Promise<string> {
	const key = await getEncryptionKeyById(keyVersion);
	return decrypt(encryptedApiKey, key);
}

/**
 * Rotate encryption keys - creates a new key and optionally re-encrypts existing API keys
 * @param reEncryptExisting - If true, re-encrypts all API keys with the new key
 */
export async function rotateEncryptionKey(
	reEncryptExisting: boolean = false,
): Promise<{ newKeyId: number }> {
	const { id: newKeyId, key: newKey } = await createEncryptionKey();

	if (reEncryptExisting) {
		const pg = getPG();

		// Get all API keys with their current encryption
		const apiKeys = await pg<
			{ id: string; key: string; key_version: number }[]
		>`
			SELECT id, key, key_version
			FROM api_keys
		`;

		// Re-encrypt each key
		for (const apiKey of apiKeys) {
			try {
				const oldKey = await getEncryptionKeyById(apiKey.key_version);
				const plainKey = decrypt(apiKey.key, oldKey);
				const newEncrypted = encrypt(plainKey, newKey);

				await prisma.apiKey.update({
					where: { id: apiKey.id },
					data: {
						key: newEncrypted,
						keyVersion: newKeyId,
					},
				});
			} catch {
				// Continue with other keys - failures don't stop rotation
				// Continue with other keys
			}
		}
	}

	return { newKeyId };
}
