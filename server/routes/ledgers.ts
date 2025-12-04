import { createLedger } from "@/domain/fns/muts/ledgers";
import { getLedger, listLedgers } from "@/domain/fns/reads/ledgers";
import { logger } from "@/domain/utils/log-util";
import { type AuthContext, requireAuth } from "@/utilities/auth-middleware";
import {
	CBORErrorResponse,
	CBORResponse,
	parseCBORRequest,
} from "@/domain/utils/request";
import { type } from "arktype";
import { arkThrow } from "@/domain/utils/arktype";

const CreateLedgerValidator = type({
	id: "number",
	name: "string>=1",
});

async function handleGet(req: Request, _authContext: AuthContext) {
	try {
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		const skipParam = url.searchParams.get("skip");
		const takeParam = url.searchParams.get("take");

		if (id) {
			const ledger = await getLedger(Number(id));
			if (!ledger) {
				return CBORErrorResponse("Ledger not found", { status: 404 });
			}
			return CBORResponse(ledger);
		}

		const skip = skipParam ? Number(skipParam) : 0;
		const take = takeParam ? Number(takeParam) : 100;

		const ledgers = await listLedgers(skip, take);
		return CBORResponse(ledgers);
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Internal server error", { status: 500 });
	}
}

async function handlePost(req: Request, _authContext: AuthContext) {
	try {
		const reqBody = (await parseCBORRequest(req)) as any;
		const body = arkThrow(CreateLedgerValidator(reqBody));

		await createLedger({
			id: body.id,
			name: body.name,
		});

		return CBORResponse("ok", { status: 201 });
	} catch (err) {
		logger.error(err as Error);
		return CBORErrorResponse("Failed to create ledger", { status: 500 });
	}
}

export const GET = requireAuth(handleGet);
export const POST = requireAuth(handlePost);
