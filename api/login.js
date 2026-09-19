// Real login check, done server-side. Replaces the old approach of loading
// the entire roster (everyone's password included) into the browser and
// comparing there. The browser only ever sends one username/password pair
// and gets back either "no" or that one person's own record — never
// anyone else's data, never any password or hash.
import { Redis } from "@upstash/redis";
import { verifyPassword, hashPassword, looksHashed } from "../lib/hash.js";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ROSTER_KEY = "gva-roster-v7";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (process.env.API_SECRET) {
    if (req.headers["x-api-secret"] !== process.env.API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const raw = await redis.get(ROSTER_KEY);
    const roster = raw ? JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) : null;
    if (!roster || !Array.isArray(roster)) {
      return res.status(503).json({ error: "Roster not seeded yet" });
    }

    const idx = roster.findIndex((p) => (p.username || "").toLowerCase() === String(username).trim().toLowerCase());
    if (idx < 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const person = roster[idx];
    let ok = false;

    if (looksHashed(person.password)) {
      ok = verifyPassword(password, person.password);
    } else {
      // Not hashed yet (seed data, or a pre-hashing Excel import). Check
      // plainly, and if it matches, upgrade it to a real hash right now —
      // no separate migration step needed.
      ok = String(person.password) === String(password);
      if (ok) {
        roster[idx] = { ...person, password: hashPassword(password) };
        await redis.set(ROSTER_KEY, JSON.stringify(roster));
      }
    }

    if (!ok) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const { password: _pw, ...safePerson } = roster[idx];
    return res.status(200).json({ user: safePerson });
  } catch (err) {
    console.error("login handler error", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
