# מגדלור — מערכת סינון לידים ל-BST

Internal lead-triage webapp for BST's urban-renewal business development. Replaces
the manual `פיתוח עסקי.xlsx`. An email arrives → the system extracts the facts,
runs deterministic triage flags + AI analysis, grades the lead, auto-generates a
"complete the details" form for the referrer, and — once the form comes back —
re-grades so a decision to advance to the appraiser (שמאי) takes ~2 minutes.

100% Hebrew, RTL, built for non-technical users. Next.js 16 · React 19 ·
Tailwind 4 · Firebase (Firestore + Auth) · Claude (Sonnet 4.6) · Resend email.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000  (redirects to /today)
```

Out of the box the app runs **with no external setup**: reads come from the seed
JSON (749 real leads + the fully-ingested "הדרים 21-23 לוד" lead), mutations
persist to `.data/dev-store.json`, and login is bypassed (`AUTH_DISABLED=true`).

`.env.local` (gitignored) holds the keys.

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | AI extraction / gap-analysis / summary |
| `CLAUDE_MODEL` | model id (default `claude-sonnet-4-6`) |
| `AUTH_DISABLED` | `true` bypasses login (QA); empty/`false` enforces it |
| `FIREBASE_SERVICE_ACCOUNT` | Admin SDK creds (server) — raw JSON or base64 |
| `NEXT_PUBLIC_FIREBASE_*` | client config for login |
| `EMAIL_LIVE` / `RESEND_API_KEY` / `EMAIL_FROM` | live outbound email |
| `APP_URL` | base for the public form links |

### Useful scripts

```bash
npm run test          # domain flags-engine tests (vitest)
npm run import:excel  # re-parse פיתוח עסקי.xlsx → data/seed/leads.json
npx tsx scripts/ingest-hadarim.ts   # re-run the AI pipeline on the real thread (needs ANTHROPIC_API_KEY)
npm run seed          # write config + leads + הדרים into Firestore (needs FIREBASE_SERVICE_ACCOUNT)
```

Reset the local demo state: `rm -rf .data`.

---

## Firebase setup (for persistence + login)

1. Create a Firebase project. Enable **Firestore** (region `me-west1`) and
   **Authentication → Email/Password**.
2. Add one user under Authentication (the demo login).
3. Project settings → Web app → copy the config into the `NEXT_PUBLIC_FIREBASE_*` vars.
4. Project settings → Service accounts → Generate new private key → put the JSON
   (single line or base64) into `FIREBASE_SERVICE_ACCOUNT`.
5. `npm run seed` to load the data.

With `FIREBASE_SERVICE_ACCOUNT` present the app uses Firestore; without it, the
seed fallback. Set `AUTH_DISABLED=` (empty) to require login.

---

## Email (live inbound + outbound)

Outbound is **Resend**; inbound is a webhook to `POST /api/inbound`.

1. Resend → add a **subdomain** of your GoDaddy domain (e.g. `bst.yourdomain.com`)
   → Resend shows MX + SPF + DKIM records.
2. GoDaddy → Manage DNS → add those records on the `bst` subdomain (root mail
   untouched). Verify in Resend.
3. Point Resend inbound (or Mailgun — interchangeable) at `https://<app>/api/inbound`.
4. Set `EMAIL_LIVE=true`, `RESEND_API_KEY`, `EMAIL_FROM=leads@bst.yourdomain.com`.

Until then, use the **＋ליד חדש** button to upload an `.eml` (same pipeline).

---

## Deploy (Netlify)

```bash
netlify login
netlify init        # or connect the repo in the Netlify UI
netlify deploy --build --prod
```

Set every production env var in **Site settings → Environment variables**
(set `AUTH_DISABLED` empty to enforce login). `netlify.toml` pins Node 22 and the
Next.js runtime.

> **Ingest timeout:** the AI extraction (~20-40s) exceeds Netlify's synchronous
> function limit (10s free / 26s Pro). The seeded demo lead and the form re-grade
> flow are fast and unaffected; for reliable *live* ingest use a higher-timeout
> plan or a background function.

---

## Demo script (5 minutes)

1. **היום** — the cockpit: new leads as decision cards, deadlines, auto-sent mail.
2. Open **הדרים 21-23 לוד** — extracted facts (36 יח"ד, 5.6 דונם, תב"ע 406-1063890),
   traffic-light flags, AI summary, the 7-question checklist.
3. Open the **public form** on a phone — known facts pre-filled; fill units,
   signatures %, source fee; submit.
4. Back on the lead — re-grades to green **"מומלץ להתקדם"**; click **העבר לשמאי**
   → the document-package checklist.
5. **לידים** — the whole Excel, searchable/filterable/exportable; **ארכיון** shows
   returning-lead memory.

---

## Architecture

```
lib/domain/     flags engine (pure, config-driven) + grading + types + config
lib/ai/         Claude pipeline: extract → gaps → summary (eml + PDFs → Lead)
lib/eml/        .eml parsing + document classification
lib/email/      provider-agnostic outbound (Resend / simulated)
lib/firebase/   repo (Firestore) + seed fallback + dev overlay
lib/ingest/     ingest run + persist (shared by upload route & webhook)
app/            RTL screens + API routes + server actions + auth
components/     design system (ui) + domain components (leads)
```

Data flow: `email → extract → preliminary grade (kill-level stops here) →
gap analysis → auto-send form → form submitted → final grade → human decision`.
