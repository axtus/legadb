/**
 * LegaDB TypeScript SDK
 *
 * A type-safe client for interacting with the LegaDB HTTP API.
 * Uses CBOR encoding for request/response bodies.
 */

import { type CborType, decodeCbor, encodeCbor } from "@std/cbor";

// ============================================================================
// Types
// ============================================================================

/** Helper to assert that a value is CBOR-encodable */
function asCborType(value: unknown): CborType {
	return value as CborType;
}

/** SDK configuration options */
export interface LegaDBConfig {
	/** Base URL of the LegaDB server (default: http://localhost:7373) */
	baseUrl?: string;
	/** API key for authentication */
	apiKey?: string;
	/** Session token for session-based auth (alternative to apiKey) */
	sessionToken?: string;
	/** Identity ID for session-based auth (required with sessionToken) */
	identityId?: string;
}

/** Pagination parameters for list operations */
export interface PaginationParams {
	skip?: number;
	take?: number;
}

/** Account balance type */
export type BalanceType = "CREDIT" | "DEBIT";

/** Transfer state */
export type TransferState = "PENDING" | "POSTED" | "VOIDED";

/** System role for users */
export type SystemRole = "admin" | "user" | "viewer";

// Entity Types

export interface Ledger {
	id: number;
	name: string;
	createdAt: string;
}

export interface Account {
	id: bigint;
	balanceType: BalanceType;
	ledgerId: number;
	externalId?: string;
	currencyCode: string;
	userData?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	minimumBalance: string;
	maximumBalance?: string;
}

export interface Currency {
	code: string;
	name: string;
	symbol: string;
	minorUnits: number;
	inUse?: boolean;
	accountCount?: number;
}

export interface Transfer {
	id: string;
	externalId?: string;
	currencyCode: string;
	debitAccountId: bigint;
	creditAccountId: bigint;
	amount: string;
	reference?: string;
	createdAt: string;
	state: TransferState;
}

export interface TransferRequest {
	id: string;
	status: "PENDING" | "COMPLETED" | "INVALID" | "FAILED";
	transferId?: string;
	createdAt: string;
}

export interface User {
	id: string;
	username: string;
	systemRole: SystemRole;
	disabledAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ApiKey {
	id: string;
	name: string;
	ledgerId?: number;
	description?: string;
	permissions: Record<string, unknown>;
	deActivatedAt?: string;
	expiresAt?: string;
	lastUsedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AuthSession {
	token: string;
	identityId: string;
	expiresAt: string;
	createdAt: string;
	systemRole?: SystemRole;
}

// Request Payload Types

export interface CreateLedgerParams {
	id: number;
	name: string;
}

export interface CreateAccountParams {
	id: number;
	ledgerId: number;
	externalId?: string;
	currencyCode: string;
	balanceType: BalanceType;
	minimumBalance: string;
	maximumBalance: string;
}

export interface CreateCurrencyParams {
	code: string;
	name: string;
	symbol: string;
	minorUnits: number;
}

export interface ImportCurrenciesParams {
	codes: string[];
}

export interface SubmitTransferParams {
	debitAccountId: bigint;
	creditAccountId: bigint;
	ledgerId: number;
	amount: string;
	reference?: string;
	externalId?: string;
}

export interface CreateUserParams {
	username: string;
	password: string;
	systemRole?: SystemRole;
}

export interface UpdateUserParams {
	action: "disable" | "enable" | "updateRole";
	userId: string;
	systemRole?: SystemRole;
}

export interface CreateApiKeyParams {
	name: string;
	ledgerId?: number;
	description?: string;
	permissions: Record<string, unknown>;
	expiresInDays?: number;
}

export interface LoginParams {
	username: string;
	password: string;
}

export interface ChangePasswordParams {
	identityId: string;
	oldPassword: string;
	newPassword: string;
}

export interface AdminChangePasswordParams {
	adminSessionToken: string;
	targetIdentityId: string;
	newPassword: string;
}

// ============================================================================
// Error Class
// ============================================================================

export class LegaDBError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "LegaDBError";
	}
}

// ============================================================================
// Client
// ============================================================================

export class LegaDBClient {
	private readonly baseUrl: string;
	private readonly apiKey?: string;
	private readonly sessionToken?: string;
	private readonly identityId?: string;

	constructor(config: LegaDBConfig = {}) {
		this.baseUrl = config.baseUrl ?? "http://localhost:7373";
		this.apiKey = config.apiKey;
		this.sessionToken = config.sessionToken;
		this.identityId = config.identityId;
	}

	// --------------------------------------------------------------------------
	// Internal Methods
	// --------------------------------------------------------------------------

	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const headers: HeadersInit = {
			"Content-Type": "application/cbor",
		};

		// Add authentication
		if (this.apiKey) {
			headers["x-auth-token"] = this.apiKey;
		} else if (this.sessionToken && this.identityId) {
			headers["Cookie"] =
				`gledger_session=${this.sessionToken}:${this.identityId}`;
		}

		const response = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: body !== undefined
				? (encodeCbor(asCborType(body)) as unknown as BodyInit)
				: undefined,
		});

		if (!response.ok) {
			let errorMessage = `HTTP ${response.status}`;
			try {
				const errorData = await response.arrayBuffer();
				if (errorData.byteLength > 0) {
					const decoded = decodeCbor(new Uint8Array(errorData)) as {
						error?: string;
					};
					if (decoded?.error) {
						errorMessage = decoded.error;
					}
				}
			} catch {
				// Ignore decoding errors
			}
			throw new LegaDBError(errorMessage, response.status);
		}

		const data = await response.arrayBuffer();
		if (data.byteLength === 0) {
			return null as T;
		}
		return decodeCbor(new Uint8Array(data)) as T;
	}

	private buildQueryString(
		params: PaginationParams | { count?: number; skip?: number },
	): string {
		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				searchParams.set(key, String(value));
			}
		}
		const qs = searchParams.toString();
		return qs ? `?${qs}` : "";
	}

	// --------------------------------------------------------------------------
	// Ledgers
	// --------------------------------------------------------------------------

	/** List all ledgers with optional pagination */
	async listLedgers(params: PaginationParams = {}): Promise<Ledger[]> {
		const qs = this.buildQueryString(params);
		return this.request<Ledger[]>("GET", `/api/ledgers${qs}`);
	}

	/** Get a single ledger by ID */
	async getLedger(id: number): Promise<Ledger> {
		return this.request<Ledger>("GET", `/api/ledgers?id=${id}`);
	}

	/** Create a new ledger */
	async createLedger(params: CreateLedgerParams): Promise<string> {
		return this.request<string>("POST", "/api/ledgers", params);
	}

	// --------------------------------------------------------------------------
	// Accounts
	// --------------------------------------------------------------------------

	/** List all accounts with optional pagination */
	async listAccounts(params: PaginationParams = {}): Promise<Account[]> {
		const qs = this.buildQueryString(params);
		return this.request<Account[]>("GET", `/api/accounts${qs}`);
	}

	/** Get a single account by ID */
	async getAccount(id: bigint): Promise<Account> {
		return this.request<Account>("GET", `/api/accounts?id=${id}`);
	}

	/** Create a new account */
	async createAccount(params: CreateAccountParams): Promise<string> {
		return this.request<string>("POST", "/api/accounts", params);
	}

	// --------------------------------------------------------------------------
	// Currencies
	// --------------------------------------------------------------------------

	/** List all currencies with optional pagination */
	async listCurrencies(params: PaginationParams = {}): Promise<Currency[]> {
		const qs = this.buildQueryString(params);
		return this.request<Currency[]>("GET", `/api/currencies${qs}`);
	}

	/** Get a single currency by code */
	async getCurrency(code: string): Promise<Currency> {
		return this.request<Currency>("GET", `/api/currencies?code=${code}`);
	}

	/** Get available currencies (not yet in database) */
	async getAvailableCurrencies(): Promise<Currency[]> {
		return this.request<Currency[]>("GET", "/api/currencies?available=true");
	}

	/** Create a new custom currency */
	async createCurrency(params: CreateCurrencyParams): Promise<string> {
		return this.request<string>("POST", "/api/currencies", params);
	}

	/** Import standard currencies by code */
	async importCurrencies(params: ImportCurrenciesParams): Promise<unknown> {
		return this.request("POST", "/api/currencies?action=import", params);
	}

	/** Delete a currency by code (only if not in use) */
	async deleteCurrency(code: string): Promise<{ success: boolean }> {
		return this.request<{ success: boolean }>(
			"DELETE",
			`/api/currencies?code=${code}`,
		);
	}

	// --------------------------------------------------------------------------
	// Transfers
	// --------------------------------------------------------------------------

	/** List transfers with optional pagination */
	async listTransfers(
		params: { count?: number; skip?: number } = {},
	): Promise<Transfer[]> {
		const qs = this.buildQueryString(params);
		return this.request<Transfer[]>("GET", `/api/transfers${qs}`);
	}

	/** Get a single transfer by ID */
	async getTransfer(id: string): Promise<Transfer[]> {
		return this.request<Transfer[]>("GET", `/api/transfers?one=${id}`);
	}

	/** Submit a transfer request */
	async submitTransfer(params: SubmitTransferParams): Promise<TransferRequest> {
		return this.request<TransferRequest>(
			"POST",
			"/api/transfer-request",
			params,
		);
	}

	// --------------------------------------------------------------------------
	// Users (Session Auth Only)
	// --------------------------------------------------------------------------

	/** List all users with optional pagination */
	async listUsers(params: PaginationParams = {}): Promise<User[]> {
		const qs = this.buildQueryString(params);
		return this.request<User[]>("GET", `/api/users${qs}`);
	}

	/** Get a user by ID */
	async getUserById(id: string): Promise<User> {
		return this.request<User>("GET", `/api/users?id=${id}`);
	}

	/** Get a user by username */
	async getUserByUsername(username: string): Promise<User> {
		return this.request<User>("GET", `/api/users?username=${username}`);
	}

	/** Create a new user */
	async createUser(params: CreateUserParams): Promise<string> {
		return this.request<string>("POST", "/api/users", params);
	}

	/** Update a user (disable, enable, or update role) */
	async updateUser(params: UpdateUserParams): Promise<string> {
		return this.request<string>("PATCH", "/api/users", params);
	}

	// --------------------------------------------------------------------------
	// API Keys (Session Auth Only)
	// --------------------------------------------------------------------------

	/** List all API keys with optional pagination */
	async listApiKeys(params: PaginationParams = {}): Promise<ApiKey[]> {
		const qs = this.buildQueryString(params);
		return this.request<ApiKey[]>("GET", `/api/api-keys${qs}`);
	}

	/** Create a new API key */
	async createApiKey(params: CreateApiKeyParams): Promise<string> {
		return this.request<string>("POST", "/api/api-keys", params);
	}

	/** Revoke an API key */
	async revokeApiKey(id: string): Promise<{ success: boolean }> {
		return this.request<{ success: boolean }>(
			"DELETE",
			`/api/api-keys?id=${id}`,
		);
	}

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	/** Login and get session token */
	async login(params: LoginParams): Promise<AuthSession> {
		return this.request<AuthSession>("POST", "/auth", {
			action: "login",
			payload: params,
		});
	}

	/** Logout and invalidate session */
	async logout(sessionToken: string): Promise<{ success: boolean }> {
		return this.request<{ success: boolean }>("POST", "/auth", {
			action: "logout",
			payload: { sessionToken },
		});
	}

	/** Get current session info */
	async getSession(): Promise<AuthSession> {
		return this.request<AuthSession>("GET", "/auth/session");
	}

	/** Change password for current user */
	async changePassword(
		params: ChangePasswordParams,
	): Promise<{ success: boolean }> {
		return this.request<{ success: boolean }>("POST", "/auth", {
			action: "changePassword",
			payload: params,
		});
	}

	/** Admin: Change password for another user */
	async adminChangePassword(
		params: AdminChangePasswordParams,
	): Promise<{ success: boolean }> {
		return this.request<{ success: boolean }>("POST", "/auth", {
			action: "admin.changePassword",
			payload: params,
		});
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/** Create a new LegaDB client with the given configuration */
export function createClient(config: LegaDBConfig = {}): LegaDBClient {
	return new LegaDBClient(config);
}

// Default export
export default LegaDBClient;
