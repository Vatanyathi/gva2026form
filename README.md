# TPC Growth & Value-Add Journey — deployable version

This is your app, unchanged, wired to a real backend so anyone with the
link can use it — no Claude account needed.

## How this works

Your app already talks to storage through four simple operations:
get / set / list / delete. That didn't change. What changed is *where*
those calls go:

- **Before**: `window.storage` (only exists inside a Claude.ai chat)
- **Now**: `src/storageShim.js` intercepts those same calls and sends them
  to `/api/kv`, a small serverless function that stores everything in
  **Vercel KV** (a real, persistent database). `src/GVAJourney.jsx` is
  your app's code, completely untouched.

## Deploy — first time (~10 minutes)

1. **Push this folder to a GitHub repo** (or use Vercel's CLI to deploy
   directly — see below).

2. **Import it into Vercel**: [vercel.com/new](https://vercel.com/new) →
   pick this repo → Vercel auto-detects Vite, no config needed → click
   Deploy once (it'll build fine even before the database exists).

3. **Add a Redis database**: Vercel's own "Vercel KV" product is
   deprecated, so use the current path instead — in your project:
   **Storage** tab → **Browse Marketplace** → search **Redis** → pick an
   Upstash-backed Redis integration → create and **connect** it to this
   project. Vercel/Upstash will inject the REST URL and token as
   environment variables automatically — `api/kv.js` checks a couple of
   likely names for these, so it should work without you renaming
   anything, but if it errors on first use, check Project → Settings →
   Environment Variables for the exact names it added and match them in
   `api/kv.js` if they differ.

4. **(Recommended) Add the shared secret** so random internet traffic
   can't hit your API: Project → **Settings** → **Environment Variables**
   → add both:
   - `API_SECRET` = some random string
   - `VITE_API_SECRET` = the *same* string

   (This isn't real per-user security — see the security note below —
   but it stops drive-by bots from finding and hitting the endpoint.)

5. **Redeploy** (Deployments tab → ⋯ → Redeploy) so the new env vars take
   effect.

6. Open the deployed URL. That's it — it's live.

## Deploy via CLI instead (if you'd rather skip GitHub)

```bash
npm install -g vercel
cd tpc-gva-journey
vercel          # first deploy, follow the prompts
vercel --prod
```

Then add the Redis integration and env vars from the Vercel dashboard
(step 3–4 above) — the Marketplace integration isn't something the CLI
sets up for you.

## Local development

```bash
npm install
npm run dev
```

Note: `/api/kv.js` only runs on Vercel's own infrastructure (or via
`vercel dev`, which proxies it locally) — plain `vite dev` alone won't
serve the API route. Use `vercel dev` instead of `npm run dev` if you
need the backend working locally too.

## Before real employees start using this — please read

I built this to get you live fast, since you needed it ASAP. Two things
are worth fixing soon, not because they'll break today, but because this
now holds real people's data:

1. **Passwords are still plaintext.** Login still works exactly like the
   prototype: the browser loads the whole roster (including everyone's
   password) and checks it client-side. That's fine for testing, not
   for a real HR tool. The fix is a proper login API route that checks
   credentials server-side and never sends other people's passwords to
   the browser — plus hashing passwords in storage (bcrypt or similar)
   instead of storing them as plain text.

2. **`/api/kv` has no per-user authorization**, only the one shared
   secret everyone's browser sends. Anyone who has the app open can
   technically read or write any key, including other people's data —
   there's no server-side check of "is this person actually an admin"
   before an admin-only write goes through. Right now the app's own
   role checks (Master Admin vs. P&O vs. Staff) only run in the
   browser, which a determined person could bypass.

Neither of these blocks you from testing with real people today. But
I'd treat closing both as the next priority right after this goes live,
before it's handling a large rollout or anything you'd consider
sensitive. Happy to build that hardening next whenever you're ready.
