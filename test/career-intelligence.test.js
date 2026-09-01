const test = require('node:test');
const assert = require('node:assert/strict');
const { LocalAiGateway, LocalAiError } = require('../local-ai');
const { createSearchPlan, eligiblePlannedJobs } = require('../search-intelligence');
const { prefillRecruiterProfile, validateRecruiterProfile } = require('../recruiter-profile');
const { composeCoverLetter, validateEditableContent } = require('../cover-letter');
const { createInterviewPlan } = require('../interview-planner');
const { createPdfBuffer } = require('../local-pdf');

const profile = { name: 'Ada Lovelace', roles: ['Senior Backend Engineer'], workEligibility: ['Brazil'], skills: ['Node.js', 'TypeScript'], keywords: ['AWS'], seniority: 'Senior' };
const job = { id: 42, company: 'Acme', title: 'Senior Backend Engineer', location: 'Brazil / Remote', region: 'Latin America', description: 'Build Node.js and TypeScript services on AWS.', open: 1 };

test('local AI gateway uses only a loopback runtime and gives a recoverable unavailable error', async () => {
  assert.throws(() => new LocalAiGateway({ baseUrl: 'https://api.example.com' }), LocalAiError);
  const calls = [];
  const gateway = new LocalAiGateway({ baseUrl: 'http://127.0.0.1:11434', fetchFn: async url => { calls.push(url); throw new TypeError('offline'); } });
  const status = await gateway.status();
  assert.equal(status.available, false); assert.match(status.error, /will not send your profile/i);
  await assert.rejects(() => gateway.generate({ prompt: 'draft' }), error => error.code === 'LOCAL_AI_UNAVAILABLE');
  assert.ok(calls.every(url => new URL(url).hostname === '127.0.0.1'));
});

test('local AI status remains unavailable until the configured local model is installed', async () => {
  const gateway = new LocalAiGateway({ baseUrl: 'http://localhost:11434', model: 'career-model', fetchFn: async () => ({ ok: true, json: async () => ({ models: [{ name: 'other-model:latest' }] }) }) });
  const status = await gateway.status();
  assert.equal(status.available, false); assert.equal(status.runtimeAvailable, true); assert.match(status.error, /not installed/i);
});

test('search planning exposes resume terms without weakening strict eligibility', () => {
  const plan = createSearchPlan(profile);
  assert.equal(plan.terms.find(term => term.value === 'Node.js').source, 'confirmed profile');
  assert.deepEqual(plan.strictEligibility, { roles: ['Senior Backend Engineer'], workEligibility: ['Brazil'] });
  const eligible = eligiblePlannedJobs([job, { ...job, id: 43, title: 'Product Designer' }], profile);
  assert.deepEqual(eligible.map(item => item.job.id), [42]);
});

test('recruiter profile prefills confirmed facts and requires valid CEFR confirmation', () => {
  const prefill = prefillRecruiterProfile(profile);
  assert.deepEqual(prefill.techStack, ['Node.js', 'TypeScript', 'AWS']); assert.equal(prefill.seniority, 'Senior');
  assert.match(validateRecruiterProfile({ ...prefill, englishLevel: 'B3', confirmed: true }, { requireConfirmation: true }).errors[0], /CEFR/);
  assert.match(validateRecruiterProfile({ ...prefill, englishLevel: 'B2' }, { requireConfirmation: true }).errors[0], /confirm/);
  assert.deepEqual(validateRecruiterProfile({ ...prefill, englishLevel: 'B2', confirmed: true }, { requireConfirmation: true }).errors, []);
});

test('cover letters require an eligible selected job, preserve evidence, and reject unsupported claims', () => {
  const letter = composeCoverLetter(profile, job);
  assert.ok(letter.evidence.some(item => item.value === 'Node.js'));
  assert.match(letter.content, /Senior Backend Engineer/);
  assert.throws(() => composeCoverLetter(profile, { ...job, title: 'Product Designer' }), /eligible job/);
  assert.throws(() => validateEditableContent(`${letter.content}\nI have 10 years of Kubernetes experience.`, letter.evidence), /unsupported years/i);
});

test('interview planner labels development areas and produces a written question bank', () => {
  const plan = createInterviewPlan({ profile, job: { ...job, description: `${job.description} Docker is required.` } });
  assert.equal(plan.selectedJob.id, 42);
  assert.ok(plan.topics.some(topic => topic.topic === 'Docker' && topic.status === 'development suggestion'));
  assert.deepEqual(new Set(plan.questionBank.map(question => question.category)).has('system design'), true);
  assert.ok(plan.studyPlan.length);
});

test('local PDF export emits a self-contained PDF artifact', () => {
  const pdf = createPdfBuffer({ title: 'Cover letter', lines: ['Private local document'] });
  assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4'); assert.match(pdf.toString(), /%%EOF/);
});
