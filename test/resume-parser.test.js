const test = require('node:test');
const assert = require('node:assert/strict');
const { parseResume, ResumeParseError } = require('../resume-parser');

const resume = 'Ada Lovelace\nSenior Backend Engineer\nada@example.com\nI build TypeScript, Node.js, AWS, Docker and SQL systems with measurable impact.';
test('extracts an editable profile from PDF text', async () => {
  const profile = await parseResume(Buffer.from('ignored'), 'ada.pdf', { pdf: async () => ({ text: resume }) });
  assert.equal(profile.name, 'Ada Lovelace');
  assert.deepEqual(profile.roles, ['Senior Backend Engineer']);
  assert.deepEqual(profile.skills, ['Node.js', 'TypeScript', 'AWS', 'Docker', 'SQL']);
});
test('supports DOCX extraction and reports scanned documents safely', async () => {
  const profile = await parseResume(Buffer.from('ignored'), 'ada.docx', { docx: { extractRawText: async () => ({ value: resume }) } });
  assert.equal(profile.extractedFrom, 'ada.docx');
  await assert.rejects(() => parseResume(Buffer.from('ignored'), 'scan.pdf', { pdf: async () => ({ text: 'image only' }) }), error => error instanceof ResumeParseError && error.code === 'NO_EXTRACTABLE_TEXT');
});
test('rejects unsupported formats with a recoverable message', async () => {
  await assert.rejects(() => parseResume(Buffer.from('x'), 'ada.txt'), error => error instanceof ResumeParseError && error.code === 'UNSUPPORTED_FORMAT');
});
