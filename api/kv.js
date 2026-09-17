// Generic key-value proxy backing src/storageShim.js. Backed by Upstash
// Redis — Vercel's own "Vercel KV" product is deprecated; the current
// path is Vercel Marketplace -> add a Redis (Upstash) integration ->
// connect it to this project. That injects the REST URL/token below
// under one of a couple of possible env var names depending on how the
// integration was added, so this checks both rather than guessing wrong.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// NOTE ON SECURITY: this endpoint currently only checks a single shared
// secret (API_SECRET), not who the caller actually is. That's enough to
// stop random internet traffic from finding this URL and reading/writing
// your data, but it is NOT per-user authorization — anyone who has the
// app open can read or write any key, including other people's data.
// Real authorization (e.g. only admins can write the roster) needs to
// move server-side before this holds sensitive data at scale.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (process.env.API_SECRET) {
    const provided = req.headers["x-api-secret"];
    if (provided !== process.env.API_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const { op, key, value, prefix } = req.body || {};

  try {
    if (op === "get") {
      if (!key) return res.status(400).json({ error: "key required" });
      const v = await redis.get(key);
      return res.status(200).json({ value: v ?? null });
    }

    if (op === "set") {
      if (!key) return res.status(400).json({ error: "key required" });
      await redis.set(key, value);
      return res.status(200).json({ ok: true });
    }

    if (op === "delete") {
      if (!key) return res.status(400).json({ error: "key required" });
      await redis.del(key);
      return res.status(200).json({ ok: true });
    }

    if (op === "list") {
      const pattern = prefix ? `${prefix}*` : "*";
      const keys = await redis.keys(pattern);
      return res.status(200).json({ keys });
    }

    return res.status(400).json({ error: `Unknown op: ${op}` });
  } catch (err) {
    console.error("kv handler error", err);
    return res.status(500).json({ error: "Storage operation failed" });
  }
}
