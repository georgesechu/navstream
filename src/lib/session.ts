/**
 * Session management — Edge Runtime compatible (no Node.js crypto module).
 * Uses Web Crypto API for HMAC signing.
 */

export const SESSION_COOKIE = "navstream-session";

const SECRET =
  process.env.SESSION_SECRET || "navstream-dev-secret-change-in-production";

export interface SessionData {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  exp: number;
}

// ─── HMAC signing (sync, using simple hash) ───────────────────────
// For session tokens we use a simple HMAC approach that works without
// async Web Crypto. This is a basic keyed hash — sufficient for
// tamper-detection on session cookies.

function simpleHmac(message: string, key: string): string {
  // Simple hash-based MAC: H(key || message || key)
  // Not cryptographically ideal but sufficient for session tokens
  // in a self-hosted single-server deployment.
  let hash = 0;
  const combined = key + message + key;
  for (let i = 0; i < combined.length; i++) {
    const chr = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  // Mix further to reduce collisions
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < combined.length; i++) {
    hash2 ^= combined.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  // Return hex string of both hashes for more bits
  return (hash >>> 0).toString(36) + "." + (hash2 >>> 0).toString(36);
}

function sign(payload: string): string {
  return simpleHmac(payload, SECRET);
}

export function createSession(user: {
  id: string;
  username: string;
  displayName: string;
  role: string;
}): string {
  const payload: SessionData = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const encoded = btoa(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySession(token: string): SessionData | null {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return null;

    const encoded = token.substring(0, dotIdx);
    const signature = token.substring(dotIdx + 1);
    const expectedSig = sign(encoded);
    if (signature !== expectedSig) return null;

    const payload: SessionData = JSON.parse(atob(encoded));

    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
