const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(process.env.JOB_RADAR_DB_PATH || path.join(dataDir, 'job-radar.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, title TEXT NOT NULL, location TEXT, region TEXT, source TEXT, posted TEXT, salary TEXT, url TEXT UNIQUE, description TEXT, open INTEGER DEFAULT 1, match_score INTEGER DEFAULT 0, matched_keywords TEXT DEFAULT '[]', missing_keywords TEXT DEFAULT '[]', status TEXT DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER NOT NULL UNIQUE, stage TEXT NOT NULL DEFAULT 'saved', applied_at TEXT, source_submitted INTEGER DEFAULT 0, notes TEXT DEFAULT '', resume_path TEXT, cover_letter_path TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(job_id) REFERENCES jobs(id));
CREATE TABLE IF NOT EXISTS scans (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT DEFAULT CURRENT_TIMESTAMP, completed_at TEXT, found_count INTEGER DEFAULT 0, source_summary TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
module.exports = db;
