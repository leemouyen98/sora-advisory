-- Migration: add financials + retirement_age columns
-- Run against your existing D1 database:
--   wrangler d1 execute goalsmapping-db --file=./migrate_add_financials.sql --remote
--
-- SQLite ALTER TABLE only supports ADD COLUMN — no risk to existing rows.
-- Both columns default to NULL/55, so contacts without data are unaffected.

ALTER TABLE contacts ADD COLUMN financials     TEXT;
ALTER TABLE contacts ADD COLUMN retirement_age INTEGER DEFAULT 55;
