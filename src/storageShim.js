// Drop-in replacement for the Claude-artifact-only `window.storage` API.
// The app's data layer (GVAJourney.jsx) only ever calls .get / .set / .list
// / .delete with `shared: true`, and every call site already tolerates a
// missing key returning null. This shim preserves that exact contract but
// talks to our own /api/kv serverless function (backed by Vercel KV)
// instead — so the rest of the app needs zero changes.

const API_BASE = "/api/kv";

async function callKV(body) {
  const headers = { "Content-Type": "application/json" };
  if (import.meta.env.VITE_API_SECRET) {
    headers["x-api-secret"] = import.meta.env.VITE_API_SECRET;
  }
  const res = await fetch(API_BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`storage ${body.op} failed: ${res.status} ${text}`);
  }
  return res.json();
}

window.storage = {
  async get(key) {
    const { value } = await callKV({ op: "get", key });
    return value == null ? null : { key, value, shared: true };
  },
  async set(key, value) {
    await callKV({ op: "set", key, value });
    return { key, value, shared: true };
  },
  async delete(key) {
    await callKV({ op: "delete", key });
    return { key, deleted: true, shared: true };
  },
  async list(prefix) {
    const { keys } = await callKV({ op: "list", prefix });
    return { keys: keys || [], prefix, shared: true };
  },
};
