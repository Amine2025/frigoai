import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const SESSION_COOKIE = "frigoai_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return "frigoai-dev-secret-change-in-production-32chars-min";
  }
  return secret;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Password hashing                                                   */
/* ------------------------------------------------------------------ */

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères");
  }
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ------------------------------------------------------------------ */
/*  Session tokens (JWT)                                              */
/* ------------------------------------------------------------------ */

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_TTL_SECONDS,
  } as jwt.SignOptions);
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
    if (!decoded?.userId) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

export async function requireUserId(): Promise<
  [string | null, null] | [null, Response]
> {
  const userId = await getSessionUserId();
  if (!userId) {
    const errorResponse = new Response(
      JSON.stringify({ error: "Authentification requise" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
    return [null, errorResponse];
  }
  return [userId, null];
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.delete(SESSION_COOKIE);
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a French phone number.
 * Accepts:
 *   +33 6/7 XX XX XX XX (international)
 *   06/07 XX XX XX XX (national 10-digit)
 *   +33 6/7XXXXXXXX (no spaces)
 */
export function isValidPhone(phone: string): boolean {
  const p = phone.trim();
  if (!p) return false;
  // +33 followed by 6 or 7, then 8 digits
  const intl = /^\+33[67]\d{8}$/;
  // 06 or 07 followed by 8 digits
  const national = /^0[67]\d{8}$/;
  return intl.test(p) || national.test(p);
}

/* ------------------------------------------------------------------ */
/*  User CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function findUserByEmail(email: string) {
  const db = await getDb();
  return db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function createUser({
  email,
  name,
  phone,
  passwordHash,
}: {
  email: string;
  name?: string;
  phone: string;
  passwordHash: string;
}) {
  const db = await getDb();
  return db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      phone: phone.trim(),
      passwordHash,
    },
  });
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const db = await getDb();
  return db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

/* ------------------------------------------------------------------ */
/*  Password reset (forgot password)                                  */
/*  In-memory store, fine for demo/dev.                              */
/* ------------------------------------------------------------------ */

interface ResetEntry {
  code: string;
  expiresAt: number;
}

// Map<emailLower, ResetEntry>
const resetStore = new Map<string, ResetEntry>();

export function generateResetToken(): string {
  // 6-digit code
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export function storeResetToken(email: string, code: string): void {
  const key = email.toLowerCase().trim();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  resetStore.set(key, { code, expiresAt });
}

export function verifyResetToken(email: string, code: string): boolean {
  const key = email.toLowerCase().trim();
  const entry = resetStore.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    resetStore.delete(key);
    return false;
  }
  if (entry.code !== code.trim()) return false;
  // consume single-use
  resetStore.delete(key);
  return true;
}

export function clearResetToken(email: string): void {
  resetStore.delete(email.toLowerCase().trim());
}
