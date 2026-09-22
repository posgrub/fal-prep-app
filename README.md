# FAL Prep – Texas Fire Alarm Technician exam trainer

Study app that takes a person from zero to passing the two Texas State Fire Marshal (SFMO) exams
required for the **Fire Alarm Technician (FAL)** license:

- **TFM11 – Fire Alarm Statutes & Rules** (Texas Insurance Code Ch. 6002 + 28 TAC §34.600)
- **TFM12 – Fire Alarm Technician** (NFPA 72-2019, NEC 2020 Art. 760/300, related NFPA sections)

Built for a Houston / Harris County, Texas company. Live at <https://falprep.restokoi.com>.

## Status

**Milestone 1 (core loop) is done:** onboarding, Today card, Review lesson, Daily Test with
80% pass mark that unlocks the next day, Results with explanation + citation, local persistence
(IndexedDB via Dexie), installable offline PWA. Also included: Practice mode (untimed, instant
feedback), a Progress tab with readiness score, and Settings › Study Documents / Harris County.
Mock exams (M2) and the reviewer/admin workflow (M4) are not built yet.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine unit tests (jest)
npm run build      # type-check + production build to dist/
npm run preview    # serve dist/
```

## Deploy

`Dockerfile` builds the static bundle and serves it with nginx on port 80 (SPA fallback,
no-cache headers for the service worker). Coolify builds it straight from this repo on push.

## Layout

| Path | What it is |
|---|---|
| `CLAUDE.md` | Instructions for the AI programmer: stack, rules, milestones. **Start here.** |
| `docs/SPEC.md` | Product spec: screens, flows, Settings › Study Documents, Settings › Harris County |
| `docs/CURRICULUM.md` | The 12-week class, human-readable |
| `content/curriculum.json` | 60 study days (review lesson + daily test) + weekly mock exams |
| `content/documents.json` | Items shown in Settings › Study Documents |
| `content/local_resources.json` | Harris County / Houston testing, fingerprinting, permitting contacts |
| `content/exam_blueprints.json` | Topic weighting used to build 50-question mock exams |
| `content/questions/*.json` | Seed question banks (TFM11 verified from TDI; TFM12 flagged for review) |
| `db/schema.sql` | Reference data model (mirrored as Dexie stores in `src/db/db.ts`) |
| `src/types.ts` | Shared TypeScript types |
| `src/engine/*.ts` | Daily session builder, spaced repetition, mock exam builder, readiness score |
| `src/db/` | Dexie database, progress helpers, test-session lifecycle |
| `src/screens/` | React screens (Today, Review, TestRunner, Results, Practice, Progress, Settings…) |
| `public/docs/` | Bundled company startup guide PDF (served in-app) |

## Content gap

The seed banks hold 25 TFM11 and 15 TFM12 questions. Early days may show fewer than 15
questions until more are added. Questions with `needsReview: true` are labelled **Unreviewed**
in the UI. Have a licensed FAL or APS holder review every such question before relying on it,
and re-check fees, phone numbers, and code editions against the sources in `content/documents.json`.
