const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(process.env.JOB_RADAR_DB_PATH || path.join(dataDir, 'job-radar.db'));
db.exec('PRAGMA busy_timeout = 5000');
db.exec(`
CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, title TEXT NOT NULL, location TEXT, region TEXT, source TEXT, posted TEXT, salary TEXT, url TEXT UNIQUE, description TEXT, open INTEGER DEFAULT 1, match_score INTEGER DEFAULT 0, matched_keywords TEXT DEFAULT '[]', missing_keywords TEXT DEFAULT '[]', status TEXT DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER NOT NULL UNIQUE, stage TEXT NOT NULL DEFAULT 'saved', applied_at TEXT, source_submitted INTEGER DEFAULT 0, notes TEXT DEFAULT '', resume_path TEXT, cover_letter_path TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(job_id) REFERENCES jobs(id));
CREATE TABLE IF NOT EXISTS scans (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT DEFAULT CURRENT_TIMESTAMP, completed_at TEXT, found_count INTEGER DEFAULT 0, source_summary TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL, job_id INTEGER REFERENCES jobs(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cover_letter_drafts (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER NOT NULL, content TEXT NOT NULL, evidence TEXT NOT NULL DEFAULT '[]', approved_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(job_id) REFERENCES jobs(id));
`);
const documentColumns = db.prepare('PRAGMA table_info(documents)').all().map(column => column.name);
if (!documentColumns.includes('job_id')) {
  try { db.exec('ALTER TABLE documents ADD COLUMN job_id INTEGER REFERENCES jobs(id)'); }
  catch (error) { if (!/duplicate column name/i.test(error.message)) throw error; }
}
// Migrate provenance without deleting jobs or their application history.
const jobColumns = db.prepare('PRAGMA table_info(jobs)').all().map(column => column.name);
for (const [name, definition] of Object.entries({ location_provenance: "TEXT DEFAULT 'source'", search_context: "TEXT DEFAULT ''" })) {
  if (!jobColumns.includes(name)) db.exec(`ALTER TABLE jobs ADD COLUMN ${name} ${definition}`);
}
db.exec(`UPDATE jobs SET location='', region='', location_provenance='search_only', match_score=0,
  matched_keywords='[]', missing_keywords='[]'
  WHERE source='Web/ATS via Brave Search' AND location_provenance='source'`);
db.exec(`CREATE TABLE IF NOT EXISTS judgments (
  fingerprint TEXT PRIMARY KEY, result TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
module.exports = db;
