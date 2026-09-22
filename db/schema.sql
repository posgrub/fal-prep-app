-- FAL Prep – reference data model (web app)
-- Now: mirror these tables as IndexedDB (Dexie) stores in the browser.
-- M4: create them in Supabase/Postgres. Porting notes: drop the PRAGMA line, replace
-- datetime('now') with now(), INTEGER booleans with boolean, TEXT JSON columns with jsonb,
-- and AUTOINCREMENT with GENERATED ALWAYS AS IDENTITY.
PRAGMA foreign_keys = ON;

CREATE TABLE user_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','reviewer','admin')),
  start_date TEXT NOT NULL,                 -- ISO date the class started
  study_days_per_week INTEGER NOT NULL DEFAULT 5,
  tfm11_exam_date TEXT,                     -- scheduled real exam dates (optional)
  tfm12_exam_date TEXT,
  reminder_time TEXT,                       -- 'HH:MM'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE content_meta (
  key TEXT PRIMARY KEY,                     -- e.g. 'contentVersion', 'adoptedEditions'
  value TEXT NOT NULL
);

CREATE TABLE question (
  id TEXT PRIMARY KEY,                      -- e.g. 'tfm12-007'
  exam TEXT NOT NULL CHECK (exam IN ('TFM11','TFM12')),
  type TEXT NOT NULL CHECK (type IN ('multiple_choice','true_false')),
  topic_tags TEXT NOT NULL,                 -- JSON array
  difficulty INTEGER NOT NULL DEFAULT 1,
  stem TEXT NOT NULL,
  options TEXT NOT NULL,                    -- JSON array [{id,text}]
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  citation TEXT NOT NULL,                   -- JSON {documentId, section}
  figure_asset TEXT,                        -- optional image path
  needs_review INTEGER NOT NULL DEFAULT 1,
  reviewed_by TEXT,
  reviewed_at TEXT,
  retired INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_question_exam ON question(exam, retired);

CREATE TABLE question_revision (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL REFERENCES question(id),
  snapshot TEXT NOT NULL,                   -- JSON of the question before the edit
  edited_by TEXT NOT NULL,
  edited_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE day_progress (
  user_id TEXT NOT NULL REFERENCES user_profile(id),
  day INTEGER NOT NULL,                     -- 1..60 from curriculum.json
  review_completed_at TEXT,
  best_test_score REAL,                     -- 0..1
  passed_at TEXT,                           -- set when best score >= pass mark
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE test_attempt (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profile(id),
  kind TEXT NOT NULL CHECK (kind IN ('daily','practice','mock')),
  exam TEXT NOT NULL,
  curriculum_day INTEGER,                   -- for daily tests
  mock_id TEXT,                             -- for mocks
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  time_limit_sec INTEGER,
  score REAL,                               -- 0..1
  passed INTEGER
);

CREATE TABLE attempt_answer (
  attempt_id TEXT NOT NULL REFERENCES test_attempt(id),
  question_id TEXT NOT NULL REFERENCES question(id),
  position INTEGER NOT NULL,
  selected TEXT,
  correct INTEGER,
  flagged INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT,
  PRIMARY KEY (attempt_id, question_id)
);

-- Spaced repetition (Leitner boxes 1..5)
CREATE TABLE sr_state (
  user_id TEXT NOT NULL REFERENCES user_profile(id),
  question_id TEXT NOT NULL REFERENCES question(id),
  box INTEGER NOT NULL DEFAULT 1,
  due_date TEXT NOT NULL,                   -- ISO date
  last_seen_at TEXT,
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE study_document (             -- mirrors content/documents.json + admin additions
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  type TEXT NOT NULL CHECK (type IN ('external','bundled','uploaded')),
  url TEXT,
  file_path TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  cost TEXT,
  edition TEXT,
  copyright_note TEXT,
  last_verified TEXT
);
