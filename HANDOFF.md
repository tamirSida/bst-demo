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
| **File storage** | `lib/storage/files.ts` — **local disk `.data/files/<leadId>/` (see OPEN DECISION below)** |
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

## ⏳ OPEN DECISION + PENDING TASK — file storage

**Problem:** files (lead PDFs, `.eml`, form uploads) are currently written to local disk
in `lib/storage/files.ts` (`.data/files/<leadId>/`) and served by `app/api/files/[leadId]/[name]`.
That disk is **ephemeral on Netlify** — files would vanish between invocations in prod.
`.data/` is gitignored/local-only. So prod needs a real object store.

**Research done this session (2026-07-18):**
- **Netlify DB** is serverless Postgres (Neon) — a *relational database*, NOT file storage. Not for this.
- **Netlify Blobs** IS Netlify's object/file store — the right tool. Zero setup (auto-provisioned
  per site, no account/keys), binary up to 5 GB/blob + metadata, **private by default** (no public
  URL; bytes only come out through our code), persists across deploys. `npm i @netlify/blobs`;
  `getStore("lead-files").set(key, buffer, {metadata})` / `.get(key, {type:"stream"})`. Only works
  in the Netlify runtime (`netlify dev` or deployed) — keep the local-disk path as the dev fallback.
- **Cloudinary** = alternative (external account + `CLOUDINARY_URL`, its own CDN, signed URLs for
  private assets). Only wins if we want CDN-offloaded delivery / transformations, or portability off
  Netlify. User leaned "private + signed" if we went this way; needs "Allow delivery of PDF/ZIP" in
  Cloudinary Security settings.

**Recommendation:** **Netlify Blobs** (deploys on Netlify already; `netlify.toml` present) — zero
keys, private by default, drops straight into the existing `/api/files` route.

**Next step (the pending task):**
1. Decide backend (Blobs recommended; Cloudinary is the alternative — awaiting user pick).
2. Implement in `lib/storage/files.ts`: make `saveLeadFile()` write to the chosen store when in
   prod (env/runtime detected), keep local disk as the dev fallback. One change covers BOTH ingest
   attachments (`lib/ingest/run.ts` → `storeAttachments`) and public-form uploads
   (`app/api/forms/[token]/route.ts`), since both call `saveLeadFile`.
3. Update `app/api/files/[leadId]/[name]/route.ts` to read from the store (stream back for Blobs;
   or redirect to a signed URL for Cloudinary). Keep the same URL contract so nothing downstream
   changes — `LeadDocument.storagePath` stays the same shape.

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
2. **Firestore** — wired but dormant (chose not to seed yet). Uncomment creds + `npm run seed`.
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
