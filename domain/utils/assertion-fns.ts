import { KnownError } from "./errors";

export function assertCheck(condition: boolean, message: string) {
	if (!condition) {
		throw new KnownError(message);
	}
}

export function assertNotNull<T>(
	val: T | null | undefined,
	message: string,
): asserts val is T {
	if (val === null || val === undefined) {
		throw new KnownError(message);
	}
}
