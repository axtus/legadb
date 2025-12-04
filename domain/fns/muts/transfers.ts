import { prisma } from "../../../prisma/prisma-client";

export async function logTransferRequest(input: Uint8Array) {
	return prisma.transferRequest.create({
		data: {
			id: Bun.randomUUIDv7(),
			body: new Uint8Array(input),
		},
		select: { id: true },
	});
}
