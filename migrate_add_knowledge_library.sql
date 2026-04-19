-- Knowledge Library Hub
-- Run: npx wrangler d1 execute goalsmapping-db --remote --file=migrate_add_knowledge_library.sql

CREATE TABLE IF NOT EXISTS knowledge_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_by  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_files (
  id           TEXT PRIMARY KEY,
  folder_id    TEXT NOT NULL REFERENCES knowledge_folders(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  r2_key       TEXT NOT NULL UNIQUE,
  mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
  size         INTEGER NOT NULL DEFAULT 0,
  uploaded_at  TEXT NOT NULL DEFAULT (datetime('now')),
  uploaded_by  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_files_folder ON knowledge_files(folder_id);
