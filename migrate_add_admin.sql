-- Migration: Add role + is_active to agents table
-- Run via: wrangler d1 execute goalsmapping-db --file=./migrate_add_admin.sql --remote

ALTER TABLE agents ADD COLUMN role TEXT NOT NULL DEFAULT 'agent';
ALTER TABLE agents ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
