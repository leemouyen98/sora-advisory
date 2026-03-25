-- GoalsMapping Agent Seed Data
-- Generated: 2026-03-22T18:35:43.429Z
-- IMPORTANT: Keep this file private — contains password hashes

-- Delete existing agents before re-seeding (optional):
-- DELETE FROM agents;

INSERT INTO agents (code, name, password_hash, salt) VALUES ('100001', 'Henry Lee', 'eff7e9b65175bfdf59bfc4bc8654b39e29322e0f6b6135997912e9102d476838', 'ab36e26faa8257277e85126a7d42210a');
INSERT INTO agents (code, name, password_hash, salt) VALUES ('100002', 'Sarah Tan', '0e354c4cc72f6134e9528d130086d06bb94693bc9cb190202a3f1a7fa1198894', '50b3c88b373a9fc31785aa1f4ced24e5');

-- Done. Passwords are PBKDF2-SHA256 hashed with 100,000 iterations.
-- Change passwords in the AGENTS array, re-run, and re-execute the SQL.
