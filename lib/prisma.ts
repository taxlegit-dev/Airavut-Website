import "server-only";
import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

function getCleanDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "";

  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  return cleaned || undefined;
}

const datasourceUrl = getCleanDatabaseUrl();

export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") prismaGlobal.prisma = prisma;
