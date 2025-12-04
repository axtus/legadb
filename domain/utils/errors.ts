export function isKnownError(value: unknown): value is KnownError {
	return value instanceof KnownError;
}

export class KnownError extends Error {
	__super__: string = "KnownError";
	httpCode: number = 400;
	constructor(message: string) {
		super(message);
		this.name = "KnownError";
	}
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			httpCode: this.httpCode,
		};
	}
}

export class AssertionError extends KnownError {
	constructor(message: string) {
		super(message);
		this.name = "AssertionError";
		this.httpCode = 400;
	}
}

export class RequestError extends KnownError {
	constructor(message: string) {
		super(message);
		this.name = "RequestError";
		this.httpCode = 400;
	}
}

export class Error401 extends KnownError {
	constructor(message: string) {
		super(message);
		this.name = "Error401";
		this.httpCode = 401;
	}
}

export class Error403 extends KnownError {
	constructor(message: string) {
		super(message);
		this.name = "Error403";
		this.httpCode = 403;
	}
}

export class Error404 extends KnownError {
	constructor(message: string) {
		super(message);
		this.name = "Error404";
		this.httpCode = 404;
	}
}

export class ErrorHttp extends KnownError {
	constructor(message: string, httpCode: number) {
		super(message);
		this.name = "ErrorHttp";
		this.httpCode = httpCode;
	}
}
