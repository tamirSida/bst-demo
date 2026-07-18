# HANDOFF — BST Lead Triage

Compact orientation for whoever picks this up. Last updated: 2026-07-18.

## What this is

A Hebrew-RTL webapp for BST Group's urban-renewal business development that replaces
their manual Excel (`../BST_files/פיתוח עסקי.xlsx`). Core loop, fully working E2E:

```
email arrives (leads@bst.portfolio-plus.com) OR manual upload (paste text / file)
  → Claude extracts facts from the Hebrew email + PDF attachments
  → deterministic triage flags + 0-100 grade + Hebrew AI summary
  → AI generates this-lead's missing-info questions → public form (token link)
  → form email AUTO-SENT via Resend → recipient fills form (no login)
  → answers re-grade the lead → human picks: לשמאי / תכנונית / שאלות / לא פעיל
```

**Client context:** BST = Israeli developer, recently IPO'd. Users: Adi Berko (biz-dev
PM, main user), Eitan Sadan (סמנכ"ל). Non-technical, rejected Monday. The reference
deal is הדרים 21-23 לוד — its real emails/PDFs live in `../BST_files/` and drive the
fixtures and tests.

## Where the knowledge sits

| What | Where |
|---|---|
| The main app | `nextjs/` (this folder) — Next.js 16, React 19, Tailwind 4 |
| Design system / BST brand | `app/globals.css` (@theme tokens), `DESIGN-SPEC.md`, `components/Logo.tsx` |
| Domain brain (flags, grading, enums, thresholds, lead edit policy) | `lib/domain/` — pure TS, unit-tested |
| AI pipeline (extract → gaps → summary) | `lib/ai/` — Claude Sonnet 4.6, Hebrew prompts |
| Email in/out | `lib/email/` (Resend + 2 safety layers), `lib/ingest/` (shared ingest path) |
| Manual upload (text/file, no email) | `lib/ingest/manual.ts`, `app/api/ingest/route.ts`, `components/leads/NewLeadButton.tsx` |
| Data layer | `lib/firebase/repo.ts` — Firestore when creds present, else local seed + `.data/` file store |
| **File storage** | `lib/storage/files.ts` — **Vercel Blob (private) in prod, local disk in dev — see below** |
| Screens | `app/(dashboard)/` + public form `app/f/[token]/` + `components/` |
| Env & secrets | `.env.local` (gitignored) — Anthropic key, Resend key, Firebase config, toggles |
| Original client materials | `../BST_files/` — real emails, questionnaires, agreements, the Excel |

## Key toggles (.env.local)

| Var | Meaning |
|---|---|
| `AUTH_DISABLED=true` | login bypass for QA (Firebase email/password + session cookie is built) |
| `EMPTY_START=true` | no demo seed data — only pipeline-created leads |
| `EMAIL_LIVE=true` | real sends via Resend (else simulated + logged) |
| `EMAIL_REDIRECT_TO` | **safety 1**: ALL outbound rerouted to this inbox with a test banner |
| `EMAIL_ALLOWED_RECIPIENTS` | **safety 2**: hard allowlist. Currently `tamirsida25@gmail.com,tamir@tippingpointc.com,leads@bst.portfolio-plus.com` |
| `CLAUDE_MODEL` | default `claude-sonnet-4-6` |
| `GOOGLE_APPLICATION_CREDENTIALS` | uncomment to switch from local store to real Firestore |

**The two email safety layers exist because the test corpus contains real lawyers'
addresses. Never remove both outside real production.** (Tests: `lib/email/providers.test.ts`.)

## ✅ File storage — DECIDED & IMPLEMENTED (2026-07-18): Vercel Blob (private)

**Problem it solved:** files (lead PDFs, `.eml`, form uploads) were written to local disk, which is
**ephemeral on Netlify** — they'd vanish between invocations in prod.

**Decision:** **Vercel Blob, private store.** Chosen over Netlify Blobs because the user wants the
file data in an account **decoupled from the Netlify hosting account** (Netlify Blobs is welded to
the Netlify site). Chosen over Cloudinary because Blob's private model — stream bytes back through
our own authenticated route — is a drop-in to the existing `/api/files` proxy, whereas Cloudinary
would need `resource_type:raw` + signed-URL redirects + a PDF-delivery toggle, and its free tier
*suspends* on overage.

**How it works now (`lib/storage/files.ts`):**
- Backend chosen at runtime by `blobEnabled()` = **is `BLOB_READ_WRITE_TOKEN` set?**
  - Token present (prod / `netlify dev` with the var) → **Vercel Blob**, `access:'private'`,
    `addRandomSuffix:false` (deterministic key `"<leadId>/<file>"` so the read route can address it).
  - No token (local dev) → **local disk** `.data/files/<leadId>/` (unchanged).
- `saveLeadFile` / `readLeadFile` / `deleteLeadFiles` are now **async**; all callers await them
  (`lib/ingest/run.ts`, `app/api/forms/[token]/route.ts`, `lib/firebase/repo.ts`).
- The read route (`app/api/files/[leadId]/[name]`) is unchanged in shape: it fetches the bytes
  (from Blob via `get(...,{access:'private'})` or from disk) and streams them with the right
  content-type/disposition. Store is **private** → bytes only ever exit through this authed route.
- `LeadDocument.storagePath` still holds `/api/files/<leadId>/<name>` — contract unchanged.
- `@vercel/blob` `2.6.1` added to deps (>= 2.3 required for private stores).

**⚠ What the user must do before prod works (one-time, ~3 min):**
1. Create a **free Vercel account** (does NOT deploy the app there — Netlify stays the host).
2. Dashboard → **Storage → Create → Blob**, set access to **Private**. (Or CLI:
   `vercel blob create-store bst-lead-files --access private`.)
3. Copy the store's **`BLOB_READ_WRITE_TOKEN`** into Netlify env vars (Site settings → Environment
   variables) — and into local `.env.local` only if testing the Blob path locally via `netlify dev`.
   Without the token, the app silently uses local disk.

## Status — done this session (all committed; see git log)

- **Full BST visual rebrand** (`e7b5d90`) matching bst.co.il: cream/bone canvas, dark-olive ink,
  thin Heebo headings (Heebo substitutes BST's proprietary `fbparking` — swap font files in if
  BST licenses it), pill buttons, dark-olive sidebar with the cream logo. Removed all "מגדלור"
  branding; `components/Logo.tsx` from `public/logo.svg` (currentColor mask). Tokens documented in
  `DESIGN-SPEC.md`. Verified by 4 UX/logic agents.
- **F1: grade in the leads table** (`1791f1a`) — traffic-light grade cell (score + tone meter +
  verdict), reusing `lib/status.ts` + the shared `verdictIcon.ts`.
- **F2: richer contact extraction** (`90661af`) — person / company / firm / email, `mailto:` link
  (`ContactCard.tsx`); stays out of follow-up questions.
- **F3: manual upload** (`81acfaf`) — paste text or a file, same pipeline, no email hook
  (`lib/ingest/manual.ts`); bypasses thread-matching.
- **F4: advanced JSON editor** (`ebcadaa`) — edit any field / add fields; safe merge policy in
  `lib/domain/leadEdit.ts` (identity/computed protected, unknown keys → `extra`).
- **Fix** (`ed71171`) — thread-key collisions: next key derived from stored leads, not an in-memory
  counter that reset on restart (was misrouting email reply-matching).
- Earlier work (before this session): full inbound/outbound E2E, delete-lead, auto-refresh,
  informative inbound status + latency, settings auto-send toggle. See `git log`.
- **43 unit tests; tsc + lint + production build all clean.**

## Status — other open items (not blocking)

1. **Deploy** — `netlify.toml` + README ready; needs `netlify login` + env vars. Caveat: AI ingest
   (~30s) exceeds Netlify sync-function limits — use a background function / higher plan at scale.
2. **Firestore** — ✅ LIVE (2026-07-18). Project `bst-demo-54800`; service-account key at
   `nextjs/serviceAccount.json` (gitignored), base64-encoded into `FIREBASE_SERVICE_ACCOUNT` in
   `.env.local`. Already seeded: 750 leads (749 Excel + הדרים), config/thresholds, 1 form. App reads
   lead *data* from Firestore; lead *files* live on Vercel Blob. For Netlify, put the same base64
   `FIREBASE_SERVICE_ACCOUNT` in the site's env vars. (`EMPTY_START=true` is now a no-op — it only
   gated the local seed, which Firestore mode bypasses.)
3. **⚠ Triage thresholds are UNVALIDATED defaults** in `lib/domain/config.ts` — BST's experts must
   review them in הגדרות before trusting the verdicts.
4. לבדיקה תכנונית records the stage change but doesn't yet email the architect.

## Run it

```bash
npm install && npm run dev   # http://localhost:3000, no setup needed
npm test                     # domain + email-safety + ingest + edit tests (43)
npm run build                # production build
npm run poll                 # dev inbound poller (after Resend receiving is enabled)
rm -rf .data                 # reset local demo state (leads + files)
```
