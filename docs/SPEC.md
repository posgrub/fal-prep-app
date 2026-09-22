# FAL Prep – Product Spec (v0.1)

## 1. Who it's for
- **Learners:** employees (or the owner) preparing for the Texas FAL license. Often studying
  on a phone between jobs, sometimes offline, in a phone or tablet browser.
- **Reviewer:** a licensed FAL/APS holder who approves question content.
- **Admin/manager:** sees team progress and exam dates.

## 2. The class structure
The course is **12 weeks, 5 study days per week (60 days) + a Saturday mock exam**.
Full day-by-day plan: `docs/CURRICULUM.md` and `content/curriculum.json`.

| Weeks | Focus | Real exam |
|---|---|---|
| 1–4 | TFM11 Statutes & Rules (TIC 6002, 28 TAC §34.600) + NFPA 72 orientation | Schedule TFM11 for week 5 |
| 5 | TFM11 final review + exam week; start NFPA 72 fundamentals | **Take TFM11** |
| 6–11 | TFM12 technical: NFPA 72 chapters, NEC 760/300, related NFPA | – |
| 12 | TFM12 full mocks + weak areas | **Take TFM12** |

### Every study day
1. **Review (20–40 min):** objectives, reading assignment (with links to the source),
   key terms, 5–10 flashcards. "Mark review complete" unlocks the test.
2. **Daily Test (15 questions, ~15 min):**
   - 10 new questions from today's topic tags
   - 5 spaced-repetition questions from earlier days (due items first, then weakest topics)
   - Pass = **80%** (config). Pass unlocks tomorrow. Fail = show missed items + "Review again", then retest with a reshuffled set.
3. **Saturday Mock Exam:** 50 questions, timed, PSI-style. Weeks 1–5 = TFM11 mocks; weeks 6–12 = TFM12 mocks (week 5 also includes a TFM11 final mock).

### Question types (match PSI)
- Multiple choice (4 options), true/false. Some questions reference a figure (store as image asset).
- Every question has: explanation, citation (document + section), topic tags, difficulty 1–3, `needsReview` flag.

## 3. Screens

### Tab bar: Today · Practice · Progress · Settings

**Today**
- Big card: "Week 3 · Day 2 — Registration and licensing rules" → [Start review] or [Take today's test].
- Countdown to each scheduled real exam.
- Streak and "readiness" gauge for the next exam.

**Review (lesson)**
- Objectives, reading list (tap → Study Documents item or external link), key terms, flashcards (flip).
- [I finished the review] → Daily Test.

**Daily Test / Practice / Mock**
- One question per screen, flag button, progress bar, timer (mock only).
- Mock: review screen listing flagged/unanswered before submit; no feedback until submit.
- Results: score, pass/fail vs. 70% (mock) or 80% (daily), topic breakdown, every question with explanation + citation.

**Practice**
- Choose TFM11 or TFM12 → topic(s) → 10/25/50 questions → instant feedback mode.
- "Missed questions" deck and "Flagged" deck.

**Progress**
- Calendar with completed days, scores by topic (heatmap), mock history chart, readiness per exam.
- [I'm ready to schedule] unlocks when readiness ≥ threshold (see §5). Links to PSI scheduling.

**Settings**
- Profile, exam dates, daily reminder time, study days per week, pass mark (admin-only), language.
- **Study Documents** (subpage) – see §4.
- **Harris County** (subpage) – see §6.
- About / content version / last-verified dates.

## 4. Settings > Study Documents (subpage)
Source: `content/documents.json`.
- Grouped sections: **TFM11 documents**, **TFM12 documents**, **Exam & licensing**, **Company guides**.
- Each row: title, what it's for, badges (`Required` / `Optional`, `Free` / `Paid`, `In app` / `External`), edition, last verified date.
- `bundled` items (PDF in `assets/docs/`) open in the in-app PDF viewer with search.
- `external` items open the system browser.
- NFPA items show a note: "Copyrighted – read free online at NFPA or buy the book. Not included in the app."
- Admin can add a document (title, URL or uploaded PDF, exam, tags).

## 5. Readiness score (per exam)
Computed in `src/engine/readiness.ts`:
- 50% = average of last 3 mock exam scores
- 30% = topic coverage (share of blueprint topics with ≥ 80% accuracy over the last 30 answers per topic)
- 20% = consistency (share of the last 14 scheduled study days completed)
- Must have **at least 2 mock exams ≥ 80%** before the "ready" badge shows, because real retakes are limited (once/week, 3 per 12 months).

## 6. Settings > Harris County (subpage)
Source: `content/local_resources.json`.
- **Take the exams:** PSI scheduling (web/phone/email), note to pick a Houston-area center at scheduling, test-day checklist.
- **Fingerprints:** SFMO formal intent → service code → IdentoGO appointment (Houston locations).
- **Get licensed:** SFMO licensing contacts, Sircon.
- **Working in Houston:** Houston Permitting Center (contractor registration, iPermits), Houston Fire Marshal's Office.
- **Outside Houston city limits:** note that unincorporated Harris County and each city (Pasadena, Baytown, Pearland, Sugar Land, Katy, etc.) are separate authorities having jurisdiction.
- Tap-to-call, tap-to-map, tap-to-email. Show "last verified" date on each item.

## 7. Data & sync
- Web app (installable PWA). Local-first storage in the browser's IndexedDB, modeled on `db/schema.sql`. Content JSON is versioned (`contentVersion`) and loaded on first run / update.
- Sync (M4): push attempts and SR state to Supabase; pull reviewed content.

## 8. Admin / reviewer
- Question list with filters (exam, topic, needsReview), edit form, approve → sets `needsReview=false`, `reviewedBy`, `reviewedAt`.
- Revision history table.
- Import JSON/CSV in the same shape as `content/questions/*.json`.

## 9. Content rules (repeat of CLAUDE.md, because it matters)
- Original wording only for NFPA-based questions; cite the section.
- Never present unreviewed items as authoritative; label them.
- Keep the adopted editions in config: NFPA 72-2019, NEC 2020 (28 TAC §34.607, eff. 9/1/2023).
