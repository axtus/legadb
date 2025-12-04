import { DBOS } from "@dbos-inc/dbos-sdk";
import { handleTransferRequest } from "../steps/transact";

export async function processTransferRequest(id: string) {
	"use workflow";
	return await handleTransferRequest(id);
}

export async function dbos_workflow_processTransferRequest(id: string) {
	await DBOS.runStep(() => handleTransferRequest(id), {
		name: "processTransferRequest",
	});
}
