import bcrypt from "bcryptjs";

// Re-export session utilities
export {
  SESSION_COOKIE,
  createSession,
  verifySession,
  type SessionData,
} from "./session";

// ─── Password Hashing ─────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
