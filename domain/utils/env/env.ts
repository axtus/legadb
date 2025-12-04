export function appenv(key: string, defaultValue?: string): string {
	const value = process.env[key] ?? defaultValue;
	if (value === undefined) {
		throw new Error(`Environment variable ${key} is not set`);
	}
	return value;
}

export const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";
