-- GoalsMapping D1 Database Schema
-- Run via: wrangler d1 execute goalsmapping-db --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS agents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT UNIQUE NOT NULL,   -- 6-digit agent code
  name       TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id                TEXT PRIMARY KEY,
  agent_code        TEXT NOT NULL,
  name              TEXT NOT NULL,
  dob               TEXT DEFAULT '',
  mobile            TEXT DEFAULT '',
  employment        TEXT DEFAULT 'Employed',
  review_date       TEXT DEFAULT '',
  review_frequency  TEXT DEFAULT 'Annually',
  notes             TEXT DEFAULT '',
  tags              TEXT DEFAULT '[]',
  interactions      TEXT DEFAULT '[]',
  tasks             TEXT DEFAULT '[]',
  activities        TEXT DEFAULT '[]',
  retirement_plan   TEXT,
  protection_plan   TEXT,
  financials        TEXT,
  retirement_age    INTEGER DEFAULT 55,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_code) REFERENCES agents(code)
);

CREATE INDEX IF NOT EXISTS idx_contacts_agent ON contacts(agent_code);
