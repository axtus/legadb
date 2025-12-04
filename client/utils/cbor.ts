import { type CborType, decodeCbor, encodeCbor } from "@std/cbor";

const CBOR = {
	pack: (value: CborType) => encodeCbor(value),
	unpack: (buffer: Uint8Array) => decodeCbor(buffer),
};

/**
 * Parse CBOR error response
 */
async function parseCBORError(response: Response): Promise<{ error: string }> {
	const arrayBuffer = await response.arrayBuffer();
	if (arrayBuffer.byteLength === 0) {
		return { error: "Empty error response" };
	}
	const uint8Array = new Uint8Array(arrayBuffer);
	const data = CBOR.unpack(uint8Array) as { error?: string };
	return { error: data.error || "Unknown error" };
}

/**
 * Normalize URL by prepending /api if needed
 */
function normalizeUrl(url: string): string {
	if (url.startsWith("/api") || url.startsWith("/auth")) {
		return url;
	}
	return `/api${url}`;
}

/**
 * Make a CBOR request
 */
async function makeRequest<T>(
	url: string,
	method: string,
	body?: CborType | Record<string, any>,
	options?: RequestInit,
): Promise<T> {
	const normalizedUrl = normalizeUrl(url);
	const { headers = {}, ...restOptions } = options || {};

	// Prepare headers
	const requestHeaders = new Headers(headers);
	requestHeaders.set("Accept", "application/cbor");

	// Encode body as CBOR if provided
	let cborBody: Uint8Array | undefined;
	if (body !== undefined) {
		if (body instanceof Uint8Array) {
			cborBody = body;
		} else if (typeof body === "object") {
			cborBody = CBOR.pack(body as CborType);
		} else {
			throw new Error("Body must be an object or Uint8Array");
		}
		requestHeaders.set("Content-Type", "application/cbor");
	}

	// Make request
	const response = await fetch(normalizedUrl, {
		...restOptions,
		method,
		headers: requestHeaders,
		body: cborBody as BodyInit | undefined,
	});

	// Handle error responses
	if (!response.ok) {
		if (response.status === 401) {
			if (window.location.pathname !== "/login") {
				window.location.href = "/logout";
			}
		}
		const errorData = await parseCBORError(response);
		throw new Error(errorData.error);
	}

	// Parse CBOR response
	const arrayBuffer = await response.arrayBuffer();
	if (arrayBuffer.byteLength === 0) {
		return null as T;
	}
	const uint8Array = new Uint8Array(arrayBuffer);
	return CBOR.unpack(uint8Array) as T;
}

/**
 * API client with CBOR request/response handling
 */
export const api = {
	/**
	 * GET request
	 */
	get<T = unknown>(url: string, options?: RequestInit): Promise<T> {
		return makeRequest<T>(url, "GET", undefined, options);
	},

	/**
	 * POST request
	 */
	post<T = unknown>(
		url: string,
		body: CborType | Record<string, any>,
		options?: RequestInit,
	): Promise<T> {
		return makeRequest<T>(url, "POST", body, options);
	},

	/**
	 * PATCH request
	 */
	patch<T = unknown>(
		url: string,
		body: CborType | Record<string, any>,
		options?: RequestInit,
	): Promise<T> {
		return makeRequest<T>(url, "PATCH", body, options);
	},

	/**
	 * DELETE request
	 */
	delete<T = unknown>(url: string, options?: RequestInit): Promise<T> {
		return makeRequest<T>(url, "DELETE", undefined, options);
	},
};
