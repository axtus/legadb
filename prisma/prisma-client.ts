import { appenv } from "@/domain/utils/env/env";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: appenv("DATABASE_URL") });
export const prisma = new PrismaClient({ adapter });
