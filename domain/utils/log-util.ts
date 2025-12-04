// oxlint-disable no-console

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogRecord {
	dt: string;
	level: LogLevel;
	message: string;
	context?: Record<string, unknown>;
	env?: string;
	build?: string;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP;

// async function sendToBetterStack(record: LogRecord) {
// 	try {
// 		await fetch(INGEST_URL, {
// 			method: "POST",
// 			headers: {
// 				"Content-Type": "application/json",
// 				Authorization: `Bearer ${unsafeConfig.betterStackKey}`,
// 			},
// 			body: JSONStringify(record),
// 		});
// 	} catch {
// 		sendToConsole(record);
// 	}
// }

async function sendToConsole(record: LogRecord) {
	const logMethod = {
		debug: console.debug,
		info: console.info,
		warn: console.warn,
		error: console.error,
	}[record.level] || console.log;

	const logParts = [
		`[${record.dt}]`,
		`[${record.level.toUpperCase()}]`,
		record.message,
	];
	if (record.env) {
		logParts.push(`[env: ${record.env}]`);
	}
	if (record.build) {
		logParts.push(`[build: ${record.build}]`);
	}
	logMethod(logParts.join(" "), record.context ? record.context : "");
}

function baseLog(
	level: LogLevel,
	message: string,
	context?: Record<string, unknown>,
) {
	const record: LogRecord = {
		dt: new Date().toISOString(),
		level,
		message,
		context,
		env: NODE_ENV,
		build: BUILD_TIMESTAMP,
	};

	// const isProd = NODE_ENV === "production";
	// if (isProd) {
	// 	sendToRemote(record);
	// 	return;
	// }
	sendToConsole(record);
}

type LogContext = Record<string, unknown> | unknown[];
const log = {
	debug: (message: string, context?: Record<string, unknown>) =>
		baseLog("debug", message, context),
	info: (message: string, context?: Record<string, unknown>) =>
		baseLog("info", message, context),
	warn: (message: string, context?: Record<string, unknown>) =>
		baseLog("warn", message, context),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error: (error: { message: string; cause?: any }) =>
		baseLog("error", error.message, error.cause as POJO),
};

export const logger = log;
export function getLogger() {
	return log;
}
export async function getLogContext(ctx: { [key: string]: unknown }) {
	return {
		debug: (message: string, context?: LogContext) =>
			log.debug(message, Object.assign(context || {}, ctx)),
		info: (message: string, context?: LogContext) =>
			log.info(message, Object.assign(context || {}, ctx)),
		warn: (message: string, context?: LogContext) =>
			log.warn(message, Object.assign(context || {}, ctx)),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		error: (error: { message: string; cause?: any }) =>
			log.error({
				message: error.message,
				cause: Object.assign(error.cause || {}, ctx),
			}),
	};
}
