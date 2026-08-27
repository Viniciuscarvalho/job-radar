const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('./db');
const { atsAdvice, evaluateJob } = require('./matcher');
const { scan } = require('./scanner');
const { getProfile, saveProfile } = require('./profile-store');
const { parseResume } = require('./resume-parser');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = process.env.JOB_RADAR_UPLOADS_PATH || path.join(__dirname, 'data', 'uploads');
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
fs.mkdirSync(UPLOADS, { recursive: true });

const send = (res, status, data, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type }); res.end(type === 'application/json' ? JSON.stringify(data) : data); };
const safe = name => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
const body = req => new Promise((resolve, reject) => { let data = ''; req.on('data', chunk => { data += chunk; if (data.length > 15 * 1024 * 1024) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); } }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); } }); });
const bytesFromDataUrl = data => Buffer.from(String(data || '').split(',').pop(), 'base64');

function refreshScores() {
  const update = db.prepare('UPDATE jobs SET match_score=?,matched_keywords=?,missing_keywords=? WHERE id=?');
  for (const job of db.prepare('SELECT * FROM jobs').all()) { const match = evaluateJob(job); update.run(match.score, JSON.stringify(match.matched), JSON.stringify(match.missing), job.id); }
}
function stats() { const rows = db.prepare('SELECT stage,COUNT(*) count FROM applications GROUP BY stage').all(); const map = Object.fromEntries(rows.map(row => [row.stage, Number(row.count)])); return { saved: map.saved || 0, applied: map.applied || 0, interview: map.interview || 0, offer: map.offer || 0, rejected: map.rejected || 0 }; }
function persistOriginalResume(input, profile) {
  if (!profile.keepResume || !input.resume?.name || !input.resume?.data) return;
  const raw = bytesFromDataUrl(input.resume.data);
  if (raw.length > MAX_RESUME_BYTES) throw Object.assign(new Error('Resume must be 10 MB or smaller'), { status: 413 });
  fs.writeFileSync(path.join(UPLOADS, `master-${Date.now()}-${safe(input.resume.name)}`), raw);
}
function jobs() {
  return db.prepare('SELECT * FROM jobs WHERE open=1 ORDER BY posted DESC').all()
    .map(job => ({ ...job, matched_keywords: JSON.parse(job.matched_keywords || '[]'), missing_keywords: JSON.parse(job.missing_keywords || '[]'), match: evaluateJob(job) }))
    .filter(job => job.match.eligible)
    .sort((left, right) => right.match.score - left.match.score || String(right.posted).localeCompare(String(left.posted)));
}
function buildServer({ scanRunner = scan, parseResumeFn = parseResume } = {}) {
  refreshScores();
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname === '/api/profile' && req.method === 'GET') return send(res, 200, getProfile());
      if (url.pathname === '/api/profile/resume' && req.method === 'POST') {
        const input = await body(req);
        if (!input.name || !input.data) return send(res, 400, { error: 'Choose a PDF or DOCX resume first.' });
        const raw = bytesFromDataUrl(input.data);
        if (raw.length > MAX_RESUME_BYTES) return send(res, 413, { error: 'Resume must be 10 MB or smaller.' });
        return send(res, 200, { draft: await parseResumeFn(raw, input.name) });
      }
      if (url.pathname === '/api/profile' && req.method === 'PUT') { const profile = saveProfile(await body(req)); refreshScores(); return send(res, 200, { profile }); }
      if (url.pathname === '/api/onboarding/complete' && req.method === 'POST') { const input = await body(req); const profile = saveProfile(input.profile); persistOriginalResume(input, profile); refreshScores(); return send(res, 200, { profile, scan: await scanRunner() }); }
      if (url.pathname === '/api/jobs' && req.method === 'GET') return send(res, 200, jobs());
      if (/^\/api\/jobs\/\d+\/match$/.test(url.pathname) && req.method === 'GET') { const id = Number(url.pathname.split('/')[3]); const job = db.prepare('SELECT * FROM jobs WHERE id=?').get(id); return job ? send(res, 200, atsAdvice(job)) : send(res, 404, { error: 'Not found' }); }
      if (url.pathname === '/api/scan' && req.method === 'POST') return send(res, 200, await scanRunner());
      if (url.pathname === '/api/stats' && req.method === 'GET') return send(res, 200, stats());
      if (url.pathname === '/api/applications' && req.method === 'GET') { const rows = db.prepare('SELECT a.*,j.company,j.title,j.url,j.match_score,j.location,j.region,j.description FROM applications a JOIN jobs j ON j.id=a.job_id ORDER BY a.updated_at DESC').all(); return send(res, 200, rows.map(row => ({ ...row, stillEligible: evaluateJob(row).eligible }))); }
      if (url.pathname === '/api/applications' && req.method === 'POST') { const input = await body(req); const stage = input.stage || 'saved'; db.prepare(`INSERT INTO applications(job_id,stage,applied_at,notes,source_submitted) VALUES(?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage,applied_at=COALESCE(excluded.applied_at,applications.applied_at),notes=excluded.notes,source_submitted=excluded.source_submitted,updated_at=CURRENT_TIMESTAMP`).run(input.job_id, stage, ['applied', 'interview', 'offer', 'rejected'].includes(stage) ? new Date().toISOString() : null, input.notes || '', input.source_submitted ? 1 : 0); db.prepare('UPDATE jobs SET status=? WHERE id=?').run(stage, input.job_id); return send(res, 200, { ok: true }); }
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1); const filePath = path.join(PUBLIC, file);
      if (filePath.startsWith(PUBLIC) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' }; return send(res, 200, fs.readFileSync(filePath), types[path.extname(filePath)] || 'application/octet-stream'); }
      send(res, 404, { error: 'Not found' });
    } catch (error) { console.error(error); send(res, error.status || 500, { error: error.message }); }
  });
}
if (require.main === module) { buildServer().listen(PORT, HOST, () => { console.log(`Job Radar running at http://localhost:${PORT}`); for (const network of Object.values(os.networkInterfaces()).flat()) if (network && network.family === 'IPv4' && !network.internal) console.log(`Mobile/LAN: http://${network.address}:${PORT}`); }); }
module.exports = { buildServer, bytesFromDataUrl, MAX_RESUME_BYTES };
