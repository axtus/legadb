import * as transferRequest from "./server/routes/transfer-request";
import * as auth from "./server/routes/auth";
import * as users from "./server/routes/users";
import * as accounts from "./server/routes/accounts";
import * as ledgers from "./server/routes/ledgers";
import * as apiKeys from "./server/routes/api-keys";
import * as currencies from "./server/routes/currencies";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { getPG } from "./domain/db/postgres";
import IndexHTML from "./client/root/index.html";
import { logger } from "./domain/utils/log-util";
import { requireAuth } from "./utilities/auth-middleware";
import { CBORResponse } from "./domain/utils/request";

const production = Bun.env.NODE_ENV === "production";
const development = !production;

// Polyfill for BigInt serialization
(BigInt.prototype as any).toJSON = function () {
	return this.toString();
};

async function dbosConfig() {
	DBOS.setConfig({
		name: "gledger",
		systemDatabaseUrl: process.env.DATABASE_URL,
	});
	await DBOS.launch();
}

async function main() {
	await dbosConfig();
	const server = Bun.serve({
		development,
		reusePort: production,
		port: 7373,
		routes: {
			"/": IndexHTML,
			"/auth": auth,
			"/auth/session": auth,
			"/api/users": users,
			"/api/accounts": accounts,
			"/api/ledgers": ledgers,
			"/api/currencies": currencies,
			"/api/api-keys": apiKeys,
			"/api/transfer-request": transferRequest,
			"/api/transfers": {
				GET: requireAuth(async (request, _authContext) => {
					const pg = getPG();
					const seachParams = new URL(request.url).searchParams;
					const one = seachParams.get("one");
					if (one) {
						const transfer = await pg`
							SELECT * FROM transfers
							WHERE id = ${one}
						`;
						return Response.json(transfer);
					}
					const count = Number(seachParams.get("count"));
					const skip = Number(seachParams.get("skip"));
					const transfers = await pg`
						SELECT * FROM transfers
						ORDER BY id
						LIMIT ${count || 100}
						OFFSET ${skip || 0}
					`;
					return CBORResponse(transfers);
				}),
			},
			"/*": IndexHTML,
		},
	});
	logger.info(
		"Bun server is running",
		{
			port: server.port,
			development,
		},
	);
}

main().catch((err) => logger.error(err));
