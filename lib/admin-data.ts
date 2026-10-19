import "server-only";
import { Prisma, InquiryStatus } from "@prisma/client";

export type InquiryFilters = {
  q?: string;
  status?: string;
  area?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
};

export function inquiryWhere(filters: InquiryFilters): Prisma.InquiryWhereInput {
  const where: Prisma.InquiryWhereInput = {};
  const q = filters.q?.trim().slice(0, 100);
  if (q) where.OR = ["fullName", "email", "phone", "organisation"].map((field) => ({ [field]: { contains: q, mode: "insensitive" } })) as Prisma.InquiryWhereInput[];
  if (filters.status && Object.values(InquiryStatus).includes(filters.status as InquiryStatus)) where.status = filters.status as InquiryStatus;
  if (filters.area?.trim()) where.area = filters.area.trim().slice(0, 100);
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.from && !Number.isNaN(Date.parse(filters.from))) createdAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
  if (filters.to && !Number.isNaN(Date.parse(filters.to))) createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  return where;
}

export function inquiryOrder(sort?: string): Prisma.InquiryOrderByWithRelationInput {
  return sort === "oldest" ? { createdAt: "asc" } : sort === "name" ? { fullName: "asc" } : { createdAt: "desc" };
}
