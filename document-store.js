const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createPdfBuffer } = require('./local-pdf');

const UPLOADS = process.env.JOB_RADAR_UPLOADS_PATH || path.join(__dirname, 'data', 'uploads');
const safe = name => path.basename(String(name || 'document')).replace(/[^a-zA-Z0-9._-]/g, '_');

function storePdf({ kind, name, title, lines, jobId = null }) {
  if (!['cover-letter', 'recruiter-profile'].includes(kind)) { const error = new Error('Unsupported local document type.'); error.status = 422; throw error; }
  const filename = `${Date.now()}-${safe(name).replace(/\.pdf$/i, '')}.pdf`;
  fs.mkdirSync(UPLOADS, { recursive: true, mode: 0o700 });
  const location = path.join(UPLOADS, filename);
  fs.writeFileSync(location, createPdfBuffer({ title, lines }), { mode: 0o600 });
  const result = db.prepare('INSERT INTO documents(kind,name,path,job_id) VALUES(?,?,?,?)').run(kind, filename, location, jobId);
  if (jobId && kind === 'cover-letter') db.prepare("INSERT INTO applications(job_id,stage,cover_letter_path) VALUES(?,?,?) ON CONFLICT(job_id) DO UPDATE SET cover_letter_path=excluded.cover_letter_path,updated_at=CURRENT_TIMESTAMP").run(jobId, 'saved', location);
  return { id: Number(result.lastInsertRowid), kind, name: filename, path: location, jobId };
}

function getDocument(id) {
  const document = db.prepare('SELECT * FROM documents WHERE id=?').get(id);
  if (!document || !fs.existsSync(document.path)) return null;
  return document;
}

module.exports = { getDocument, storePdf };
