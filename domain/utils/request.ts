import { CBOR } from "./serde/cbor";

/**
 * Parse CBOR request body from a Request object
 */
export async function parseCBORRequest(req: Request) {
	const arrayBuffer = await req.arrayBuffer();
	if (arrayBuffer.byteLength === 0) {
		throw new Error("Request body is empty");
	}
	const uint8Array = new Uint8Array(arrayBuffer);
	return CBOR.unpack(uint8Array);
}

/**
 * Create a CBOR response
 */
export function CBORResponse<VAL extends Record<string, ALL>>(
	val: VAL | VAL[] | string | null,
	opts: { status?: number; headers?: HeadersInit } = {},
) {
	if (val === null) {
		return new Response(null, { status: 404 });
	}
	const headers = new Headers(opts.headers);
	headers.set("Content-Type", "application/cbor");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return new Response(CBOR.pack(val) as any, {
		headers,
		status: opts.status ?? 200,
	});
}

/**
 * Create a CBOR error response
 */
export function CBORErrorResponse(
	error: string,
	opts: { status?: number; headers?: HeadersInit } = {},
) {
	return CBORResponse({ error }, {
		status: opts.status ?? 500,
		headers: opts.headers,
	});
}
