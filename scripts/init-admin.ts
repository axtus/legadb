#!/usr/bin/env bun
// oxlint-disable no-console

import { prisma } from "@/prisma/prisma-client";
import { hashPassword } from "@/utilities/password";
import { randomBytes } from "crypto";

async function main() {
	const username = "alloys";
	const password = "password123";

	console.log(`\n🔐 Initializing admin user: ${username}`);

	// Check if user already exists
	const existing = await prisma.authIdentity.findUnique({
		where: { username },
	});

	if (existing) {
		console.log(
			`\n⚠️  User "${username}" already exists. Updating password...`,
		);

		const passwordHash = await hashPassword(password);
		await prisma.authIdentity.update({
			where: { username },
			data: { passwordHash },
		});

		console.log(`\n✅ Password updated successfully!`);
		console.log(`\n   Username: ${username}`);
		console.log(`   ID: ${existing.id}`);
	} else {
		console.log(`\n📝 Creating new admin user...`);

		const passwordHash = await hashPassword(password);
		const identity = await prisma.authIdentity.create({
			data: {
				id: randomBytes(6).toString("hex"),
				username,
				passwordHash,
			},
		});

		console.log(`\n✅ Admin user created successfully!`);
		console.log(`\n   Username: ${username}`);
		console.log(`   ID: ${identity.id}`);
	}

	console.log(`\n`);
}

main().catch((err) => {
	console.error("\n❌ Error:", err);
	process.exit(1);
});
