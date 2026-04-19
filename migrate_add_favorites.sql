-- Knowledge Library — per-agent file favourites
-- Run: npx wrangler d1 execute goalsmapping-db --remote --file=migrate_add_favorites.sql

CREATE TABLE IF NOT EXISTS knowledge_favorites (
  agent_code  TEXT NOT NULL,
  file_id     TEXT NOT NULL REFERENCES knowledge_files(id) ON DELETE CASCADE,
  starred_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (agent_code, file_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_favorites_agent ON knowledge_favorites(agent_code);
