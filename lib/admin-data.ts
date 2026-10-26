import "server-only";
import { Prisma, InquiryStatus, CareerApplicationStatus } from "@prisma/client";

export type InquiryFilters = {
  q?: string;
  status?: string;
  page?: string;
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  IN_REVIEW: "In Review",
  CLOSED: "Closed"
};

export function inquiryWhere(filters: InquiryFilters, { includeStatus = true } = {}): Prisma.InquiryWhereInput {
  const where: Prisma.InquiryWhereInput = {};
  const q = filters.q?.trim().slice(0, 100);
  if (q) where.OR = ["fullName", "email", "phone", "organisation", "area"].map((field) => ({ [field]: { contains: q, mode: "insensitive" } })) as Prisma.InquiryWhereInput[];
  if (includeStatus && isInquiryStatus(filters.status)) where.status = filters.status;
  return where;
}

export function isInquiryStatus(value?: string): value is InquiryStatus {
  return Boolean(value && Object.values(InquiryStatus).includes(value as InquiryStatus));
}

export type ApplicationFilters = {
  q?: string;
  status?: string;
  page?: string;
};

export function applicationWhere(filters: ApplicationFilters, { includeStatus = true } = {}): Prisma.CareerApplicationWhereInput {
  const where: Prisma.CareerApplicationWhereInput = {};
  const q = filters.q?.trim().slice(0, 100);
  if (q) where.OR = ["fullName", "email", "phone", "location", "role"].map((field) => ({ [field]: { contains: q, mode: "insensitive" } })) as Prisma.CareerApplicationWhereInput[];
  if (includeStatus && isApplicationStatus(filters.status)) where.status = filters.status;
  return where;
}

export function isApplicationStatus(value?: string): value is CareerApplicationStatus {
  return Boolean(value && Object.values(CareerApplicationStatus).includes(value as CareerApplicationStatus));
}
