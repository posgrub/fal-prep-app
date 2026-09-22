# CLAUDE.md – build instructions for the AI programmer

## Goal
A study app that takes a person from zero to passing **TFM11** and **TFM12** (Texas FAL license)
in ~12 weeks. Every study day = **Review** (lesson) → **Daily Test** (must pass to unlock the next day).
Saturdays = timed mock exam. The app also holds a **Study Documents** library under Settings and a
**Harris County** resources page.

## Stack (recommended – keep unless there is a strong reason)
- **Web app: React + Vite + TypeScript**, React Router. Mobile-first responsive layout so it works well
  in a phone browser; make it an **installable PWA** (manifest + service worker) so it can be added to a
  home screen and keep working offline in the field.
- **Local storage:** IndexedDB via **Dexie** for progress, attempts, and spaced-repetition state
  (works offline). `db/schema.sql` is the reference data model – mirror its tables as Dexie stores.
- **Optional sync (Milestone 4):** Supabase (Postgres + auth) so a manager can see each employee's progress.
  `db/schema.sql` ports to Postgres with minor changes (see the note at the top of that file).
- **PDF viewing:** open bundled PDFs in the browser's built-in viewer (or `pdf.js` for an in-app viewer);
  external links open in a new tab.
- **Hosting:** any static host (Vercel, Netlify, Cloudflare Pages) until Supabase is added.
- **Tests:** Jest for `src/engine/*` (already set up).

## Hard rules
1. **Content accuracy is a safety and legal issue.** Questions with `"needsReview": true` must be
   visibly labeled "Unreviewed" in the UI until a licensed person (FAL/APS holder) approves them in the
   admin screen. Never auto-generate questions and ship them without review.
2. **Copyright.** NFPA 72 and the NEC are copyrighted by NFPA. Do **not** bundle, scrape, OCR, or quote
   them beyond short references. The app links to NFPA free access / purchase pages. Questions must be
   original wording with a section citation (e.g., "NFPA 72-2019 §17.7.3").
   Texas statutes (TIC 6002) and rules (28 TAC) are public government text – linking is fine; bundling a
   downloaded copy is acceptable, but always show the "retrieved on" date and a link to the live source.
3. **Code editions:** TFM12 content = **NFPA 72 (2019)** and **NFPA 70 / NEC (2020)**, as adopted in
   28 TAC §34.607 effective Sept 1, 2023. Keep the edition in a single config value (`config.adoptedEditions`)
   so it can be updated if SFMO adopts newer editions.
4. **Exam realism:** 50 questions, closed book, true/false + multiple choice, 70% to pass. Time limit is
   configurable (default 120 min – confirm in the PSI Candidate Information Bulletin).
5. **Retake reality check:** the real exams can be taken only once per week and 3 times per 12 months.
   The app's readiness score must gate the "I'm ready to schedule" button (see `readiness.ts`).

## Milestones
**M1 – Core loop (MVP)**
- Onboarding: name, role, target test dates (TFM11, TFM12), study days per week.
- Home "Today" card: current day's Review → Daily Test, streak, days to exam.
- Review screen renders lesson from `curriculum.json` (objectives, reading assignment with source links, key terms, flashcards).
- Daily Test: 15 questions via `buildDailySession()`; pass mark 80% (config) unlocks next day; fail → "Review again" + retry with reshuffled items.
- Results screen with per-question explanation + citation.
- Local persistence of attempts + spaced-repetition state.

**M2 – Practice & mocks**
- Practice mode: pick exam (TFM11/TFM12), topic, count; untimed with instant feedback.
- Mock exam: `buildMockExam()` 50 Q timed, no feedback until submit, PSI-style navigation (flag, review, submit).
- Weak-area report by topic; readiness score (`readiness.ts`).

**M3 – Library & local info**
- Settings > **Study Documents** subpage (from `content/documents.json`): grouped by exam, bundled PDFs open in-app, external links open browser, "free / paid / required / optional" badges, last-verified date.
- Settings > **Harris County** subpage (from `content/local_resources.json`): tap-to-call, tap-to-map, links.
- Exam day checklist.

**M4 – Team & admin**
- Supabase auth; roles: `learner`, `reviewer` (licensed), `admin`.
- Reviewer queue: approve/edit/retire questions; every edit keeps a revision history.
- Manager dashboard: progress per employee, readiness, upcoming exam dates.
- Question import (CSV/JSON) for adding more banks.

**M5 – Nice to have**
- AI-assisted draft question generation from the public TIC 6002 / 28 TAC text only, landing in the reviewer queue (never directly live).
- Spanish UI toggle.
- Push reminders for daily session.

## Definition of done for M1
- `npm test` passes for all engine functions.
- A new user can complete Day 1 Review + Daily Test, close the browser tab, reopen the app (including offline as an installed PWA), and see Day 2 unlocked.

## What already exists in this kit
- `src/engine/*` is written and tested: `npm install && npm test` (7 tests pass, `tsc --noEmit` clean).
  Move these files into the web project unchanged; UI calls them.
- `content/*.json` is the single source of truth for the course, documents, local info, and blueprints.

## Content gap you must plan for
The seed banks hold **25 TFM11** (verified against TDI pages) and **15 TFM12** (unreviewed) questions.
A 60-day course with 15-question daily tests and weekly 50-question mocks needs roughly
**250+ TFM11** and **450+ TFM12** questions to avoid heavy repetition. Build the reviewer workflow (M4)
early, or have the reviewer add questions through the JSON import format in `content/questions/`.

## Question JSON shape
```json
{ "id": "tfm12-016", "exam": "TFM12", "type": "multiple_choice", "topicTags": ["tfm12.smoke"],
  "difficulty": 2, "stem": "…", "options": [{"id":"a","text":"…"}], "answer": "a",
  "explanation": "…", "citation": {"documentId": "nfpa-72-2019", "section": "§17.7.3"},
  "needsReview": true }
```
Topic tags must match `content/exam_blueprints.json`.
