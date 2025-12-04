import { logTransferRequest } from "@/domain/fns/muts/transfers";
import { logger } from "@/domain/utils/log-util";
import { CBORResponse } from "@/domain/utils/request";
import { dbos_workflow_processTransferRequest } from "@/workflows/workflows/load-transaction";
// import { processTransferRequest } from "@/workflows/workflows/load-transaction";
// import { start } from "workflow/api";

export async function POST(req: Request) {
	const body = await req.arrayBuffer();
	if (!body) {
		logger.error({
			message: "Transfer request body is empty",
			cause: {
				method: "transfer-request",
			},
		});
		return CBORResponse(null, { status: 400 });
	}
	const res = await logTransferRequest(new Uint8Array(body));
	dbos_workflow_processTransferRequest(res.id);
	// start(processTransferRequest, [res.id]);
	logger.info("new transfer request", res);
	return CBORResponse(res);
}
