// Password hashing shared by api/login.js and api/set-passwords.js.
// Uses Node's built-in scrypt — no extra dependency, no plaintext at rest.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(plain), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(String(plain), salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// A person's stored password looks hashed ("<salt>:<hash>") once this system
// has touched it. Anything else (plain text left over from the seed data,
// or an Excel import) is treated as not-yet-hashed so login/migration can
// upgrade it transparently on first successful use.
export function looksHashed(value) {
  return typeof value === "string" && /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(value);
}
