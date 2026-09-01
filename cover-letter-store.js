const db = require('./db');
const { validateEditableContent } = require('./cover-letter');

function createDraft({ jobId, content, evidence }) {
  const result = db.prepare('INSERT INTO cover_letter_drafts(job_id,content,evidence) VALUES(?,?,?)').run(jobId, content, JSON.stringify(evidence));
  return getDraft(Number(result.lastInsertRowid));
}
function getDraft(id) {
  const draft = db.prepare('SELECT * FROM cover_letter_drafts WHERE id=?').get(id);
  return draft ? { ...draft, evidence: JSON.parse(draft.evidence || '[]') } : null;
}
function updateDraft(id, content) {
  const draft = getDraft(id);
  if (!draft) return null;
  if (draft.approved_at) { const error = new Error('Approved cover letters cannot be changed. Create a new draft to edit it.'); error.status = 409; throw error; }
  const validated = validateEditableContent(content, draft.evidence);
  db.prepare('UPDATE cover_letter_drafts SET content=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(validated, id);
  return getDraft(id);
}
function approveDraft(id) {
  const draft = getDraft(id);
  if (!draft) return null;
  if (!draft.approved_at) db.prepare('UPDATE cover_letter_drafts SET approved_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(new Date().toISOString(), id);
  return getDraft(id);
}
module.exports = { approveDraft, createDraft, getDraft, updateDraft };
