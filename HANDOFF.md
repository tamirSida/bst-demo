# HANDOFF — מגדלור (BST Lead Triage)

Compact orientation for whoever picks this up. Last updated: 2026-07-16.

## What this is

A Hebrew-RTL webapp for BST Group's urban-renewal business development that replaces
their manual Excel (`../BST_files/פיתוח עסקי.xlsx`). Core loop, fully working E2E:

```
email arrives (leads@bst.portfolio-plus.com or .eml upload)
  → Claude extracts facts from the Hebrew email + PDF attachments
  → deterministic triage flags + 0-100 grade + Hebrew AI summary
  → AI generates this-lead's missing-info questions → public form (token link)
  → form email AUTO-SENT via Resend → recipient fills form (no login)
  → answers re-grade the lead → human picks: לשמאי / תכנונית / שאלות / לא פעיל
```

**Client context** (see `/Users/tamirsida/.claude/plans/ok-pls-gain-context-velvety-bee.md`
for the full plan): BST = Israeli developer, recently IPO'd. Users: Adi Berko
(biz-dev PM, the main user), Eitan Sadan (סמנכ"ל). Non-technical, rejected Monday.
The real reference deal is הדרים 21-23 לוד — its actual emails/tender PDFs are in
`../BST_files/` and drive all fixtures and tests.

## Where the knowledge sits

| What | Where |
|---|---|
| The main app | `nextjs/` (this folder) — Next.js 16, React 19, Tailwind 4 |
| Domain brain (flags, grading, enums, thresholds) | `lib/domain/` — pure TS, 13 tests |
| AI pipeline (extract → gaps → summary) | `lib/ai/` — Claude Sonnet 4.6, Hebrew prompts |
| Email in/out | `lib/email/` (Resend + safety layers), `lib/ingest/` (shared ingest path) |
| Data layer | `lib/firebase/repo.ts` — Firestore when creds present, else local seed + `.data/` file store |
| Screens | `app/(dashboard)/` + public form `app/f/[token]/` + design system `components/` |
| API surface | `app/api/`: `ingest` (.eml upload), `inbound` (webhook), `inbound/poll` (dev poller), `forms/[token]`, `files/...`, `session` |
| Env & secrets | `.env.local` (gitignored) — Anthropic key, Resend key, Firebase config, toggles |
| Original client materials | `../BST_files/` — real emails, questionnaires, agreements, the Excel |
| Product decisions log | the plan file above + git history (small, descriptive commits) |

## Key toggles (.env.local)

| Var | Meaning |
|---|---|
| `AUTH_DISABLED=true` | login bypass for QA (auth is built: Firebase email/password + session cookie) |
| `EMPTY_START=true` | no demo seed data — only pipeline-created leads |
| `EMAIL_LIVE=true` | real sends via Resend (else simulated + logged) |
| `EMAIL_REDIRECT_TO` | **safety 1**: ALL outbound rerouted to this inbox with a test banner |
| `EMAIL_ALLOWED_RECIPIENTS` | **safety 2**: hard code allowlist. unset=deny-all-but-redirect, `*`=production |
| `CLAUDE_MODEL` | default `claude-sonnet-4-6` |
| `GOOGLE_APPLICATION_CREDENTIALS` | uncomment to switch from local store to real Firestore |

**The two email safety layers exist because the test corpus contains real lawyers'
addresses. Never remove both outside real production.** (Tests cover this: `lib/email/providers.test.ts`.)

## Quality gates run

- **4 independent RTL-Hebrew UX/UI audits** (typography/RTL, non-tech clarity,
  visual design, flows) — 34 findings, all criticals+majors fixed same-day
  (two-step reject confirm, %/₪ suffix overlap, form-title duplication, real
  file uploads on the public form, archived-lead state, confirm dialogs on
  email-sending actions, and more; see commit 360048f).
- **Re-verification: all 4 lenses APPROVED** (final round measured the RTL
  tooltip fix at 0px offset and confirmed clean regenerated data).
- **3 non-technical persona walkthroughs** (PM, exec, lawyer's secretary) —
  all completed their core tasks unassisted; their feedback (referrer name on
  the public form, upload-type hints, CSV label) was applied.

## Status — done

- Full outbound E2E verified live: ingest real email → extraction (36 יח"ד, 5.6 דונם,
  תב"ע 406-1063890) → form email delivered via Resend → link opened from Gmail →
  form filled + PDF attached → re-grade 75→82 → questionnaire tracker complete.
- שלח שאלות is real (AI regenerates questions → new form → real send). All actions
  give Hebrew feedback + timeline entries + Excel-style date stamps.
- Attachments (original .eml + PDFs) stored per lead and openable from the lead page.
- Reply thread-matching via `[BST-L-xxxx]` marker → attaches to the existing lead.
- 19 unit tests; tsc + production build clean.

## Status — open

1. **Inbound live test** — code built (webhook + dev poller `npm run poll`), but the
   domain's *receiving* is disabled. Needs: Resend dashboard → domain → enable
   receiving → add the shown MX record in GoDaddy → send a test email → run poller.
2. **Deploy** — `netlify.toml` + README ready; needs `netlify login` + env vars.
   Caveat: AI ingest (~30s) exceeds Netlify sync-function limits (10s free/26s Pro) —
   use a background function or higher plan for live inbound at scale.
3. **Firestore** — wired but dormant (user chose not to seed yet). Uncomment the
   creds line + `npm run seed` when wanted. `serviceAccount.json` is local-only.
4. **⚠ Triage thresholds are UNVALIDATED defaults** — my research-grounded guesses
   (24-unit floor, multiplier floors per region, density bands, fee caps, score
   weights in `lib/domain/config.ts`). BST's experts must review them in הגדרות
   before anyone trusts the verdicts.
5. לבדיקה תכנונית records the stage change but doesn't yet email the architect.
6. Netlify file storage: `lib/storage/files.ts` writes to local disk — swap to
   Firebase Storage for production (single function, contract is the URL).

## Run it

```bash
npm install && npm run dev   # http://localhost:3000, no setup needed
npm test                     # domain + email-safety tests
npm run poll                 # dev inbound poller (after receiving is enabled)
rm -rf .data                 # reset local demo state
```
