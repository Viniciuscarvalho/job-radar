const db = require('./db');
const { fingerprint, jobState } = require('./judgments');
function getAnalysis(job, profile) {
  const row = db.prepare('SELECT result FROM judgments WHERE fingerprint=?').get(fingerprint(jobState(job, profile)));
  return row ? JSON.parse(row.result) : null;
}
function saveAnalysis(result) {
  db.prepare('INSERT OR REPLACE INTO judgments(fingerprint,result) VALUES(?,?)').run(result.fingerprint, JSON.stringify(result));
  return result;
}
module.exports = { getAnalysis, saveAnalysis };
