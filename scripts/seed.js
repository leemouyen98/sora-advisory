#!/usr/bin/env node
/**
 * GoalsMapping — Seed Script
 * Generates SQL INSERT statements for agent accounts with hashed passwords.
 *
 * Usage:
 *   node scripts/seed.js > seed.sql
 *   wrangler d1 execute goalsmapping-db --file=./seed.sql --remote
 *
 * Add/edit agents in the AGENTS array below.
 */

import crypto from 'crypto'

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex')
}

// ─── Configure your agents here ───────────────────────────────────────────────
const AGENTS = [
  { code: '100001', name: 'Henry Lee',  password: 'demo123' },
  { code: '100002', name: 'Sarah Tan',  password: 'demo123' },
]
// ──────────────────────────────────────────────────────────────────────────────

console.log('-- GoalsMapping Agent Seed Data')
console.log('-- Generated:', new Date().toISOString())
console.log('-- IMPORTANT: Keep this file private — contains password hashes\n')
console.log('-- Delete existing agents before re-seeding (optional):')
console.log("-- DELETE FROM agents;\n")

for (const agent of AGENTS) {
  const salt = generateSalt()
  const hash = hashPassword(agent.password, salt)
  console.log(`INSERT INTO agents (code, name, password_hash, salt) VALUES ('${agent.code}', '${agent.name}', '${hash}', '${salt}');`)
}

console.log('\n-- Done. Passwords are PBKDF2-SHA256 hashed with 100,000 iterations.')
console.log('-- Change passwords in the AGENTS array, re-run, and re-execute the SQL.')
