// import only one appenv
import { appenv } from "../utils/env/env";

declare global {
	// Add type for the singleton instance
	var __pg_instance: Bun.SQL; // InstanceType<typeof Bun.SQL> | undefined;
}

export function getPG() {
	const dbURL = appenv("DATABASE_URL");
	if (globalThis.__pg_instance) {
		return globalThis.__pg_instance;
	}
	// globalThis.__pg_instance = new Bun.SQL(dbURL);
	globalThis.__pg_instance = new Bun.SQL(dbURL);
	return globalThis.__pg_instance;
}
