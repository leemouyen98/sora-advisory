-- Migration: Persist contact fields already collected by Add/Edit Contact forms
-- but never saved to the database (email, pipeline stage, income bracket,
-- referral source). Without these columns, stage assignment silently reverts
-- to "Lead" on every reload because getEffectiveStage() falls back to
-- inferring stage from tags when contact.stage is empty.
-- Run via: wrangler d1 execute goalsmapping-db --file=./migrate_add_contact_fields.sql --remote

ALTER TABLE contacts ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN stage TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN income_bracket TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN referred_by TEXT DEFAULT '';
