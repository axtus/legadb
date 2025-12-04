import { type CborType, decodeCbor, encodeCbor } from "@std/cbor";

export const CBOR = {
	pack: (value: CborType) => encodeCbor(value),
	unpack: (buffer: Uint8Array) => decodeCbor(buffer),
};
