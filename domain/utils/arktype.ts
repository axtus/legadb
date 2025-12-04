import { ArkErrors } from "arktype";

export function prepareArkTypeErrors(input: ArkErrors) {
	const cache: {
		message: string;
		description?: string;
	}[] = [];
	input.forEach((inputVal) => {
		cache[cache.length] = {
			message: inputVal.message,
			description: inputVal.description,
		};
	});
	return cache;
}

export function arkThrow<T>(input: T | ArkErrors): T {
	if (input instanceof ArkErrors) {
		const error = new Error("Arktype Validation Error");
		error.cause = prepareArkTypeErrors(input);
		throw error;
	} else return input;
}
