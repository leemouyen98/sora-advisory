-- Migration: Add contact info fields to agents table
-- Run via: wrangler d1 execute goalsmapping-db --file=./migrate_add_agent_contact.sql --remote

ALTER TABLE agents ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN mobile TEXT NOT NULL DEFAULT '';
