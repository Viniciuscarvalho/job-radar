const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProfile, draftFromResponse, planFromResponse } = require('../public/career-intelligence');

test('normalises recruiter-profile CEFR aliases for the editable UI', () => {
  const profile = normalizeProfile({ techStack: ['Node.js'], englishLevel: 'B2', confirmedAt: '2026-09-01T00:00:00.000Z' });
  assert.deepEqual(profile.techStack, ['Node.js']);
  assert.equal(profile.englishProficiency, 'B2');
  assert.equal(profile.confirmed, true);
});

test('adapts local cover-letter and interview-plan API responses into editable view data', () => {
  assert.deepEqual(draftFromResponse({ draft: { content: 'Dear hiring team', approved: false } }), { content: 'Dear hiring team', evidence: [], approved: false });
  assert.deepEqual(planFromResponse({ topics: ['TypeScript'], studyPlan: ['Review types'], questionBank: ['Explain narrowing'] }), { summary: '', studyTopics: ['TypeScript'], questions: ['Explain narrowing'] });
});
