import "server-only";

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "airavut_admin";
const SESSION_SECONDS = 60 * 60 * 8;

type SessionPayload = { email: string; expires: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return value;
}

const encode = (value: string) => Buffer.from(value).toString("base64url");
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export async function createAdminSession(email: string) {
  const payload = encode(JSON.stringify({ email, expires: Date.now() + SESSION_SECONDS * 1000 } satisfies SessionPayload));
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    return parsed.expires > Date.now() && typeof parsed.email === "string" && parsed.email.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string, encoded = "") {
  if (!encoded) return false;
  const delimiter = encoded.includes("$") ? "$" : ":";
  const [algorithm, saltValue, keyValue] = encoded.split(delimiter);
  if (algorithm !== "scrypt" || !saltValue || !keyValue) return false;
  try {
    const expected = Buffer.from(keyValue, "base64url");
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function makePasswordHash(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!email) return;
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (!existing) {
      await prisma.adminUser.create({
        data: {
          email,
          passwordHash: hash || makePasswordHash("admin@123456"),
          name: "Administrator"
        }
      });
    }
  } catch {
    // ignore if table not yet initialized or already created
  }
}

export async function requestIp() {
  const requestHeaders = await headers();
  return requestHeaders.get("cf-connecting-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export function keyedHash(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export const checksum = (content: Buffer) => createHash("sha256").update(content).digest("hex");

export async function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
