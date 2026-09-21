const test = require('node:test');
const assert = require('node:assert/strict');
const { himalayas, jobicy } = require('../scanner');
const { analyzeJob, reviewClaims } = require('../judgments');
const { applyJudgment } = require('../judgment-match');
const { evaluateJob } = require('../matcher');

const profile = { roles: ['Senior Backend Engineer'], workEligibility: ['Brazil'], skills: ['Node.js'], keywords: [], seniority: 'Senior' };
const job = { id: 1, title: 'Backend platform engineer', company: 'Acme', location: 'Brazil', region: 'Brazil', source: 'Test source', url: 'https://example.test/1', description: 'Brazil residents only. Build Node.js services. Docker is a nice to have.' };

function gatewayFor(value) { return { generate: async () => ({ text: JSON.stringify(value) }) }; }

test('free public sources preserve source-backed job fields without an API key', async () => {
  const himalayasResults = await himalayas({ profile, fetchJsonFn: async () => ({ jobs: [{ companyName: 'Himalayas Co', title: 'Backend Engineer', locationRestrictions: ['Brazil'], description: '<p>Node.js</p>', pubDate: 1, applicationLink: 'https://himalayas.app/jobs/1' }] }) });
  const jobicyResults = await jobicy({ profile, fetchJsonFn: async () => ({ jobs: [{ companyName: 'Jobicy Co', jobTitle: 'Backend Engineer', jobGeo: 'LATAM', jobDescription: '<p>Node.js</p>', pubDate: '2026-09-21T00:00:00Z', url: 'https://jobicy.com/jobs/1' }] }) });
  assert.deepEqual(himalayasResults[0], { company: 'Himalayas Co', title: 'Backend Engineer', location: 'Brazil', region: 'Brazil', source: 'Himalayas', posted: '1970-01-01', salary: 'Not disclosed', url: 'https://himalayas.app/jobs/1', description: 'Node.js', open: true });
  assert.equal(jobicyResults[0].source, 'Jobicy');
  assert.equal(jobicyResults[0].location, 'LATAM');
});

test('local judgment requires defined answers and source IDs, then uses only supported requirements for ranking', async () => {
  const value = { answers: {
    role: { value: 'role:0', evidenceIds: ['title:0'] },
    eligibility: { value: 'explicitly_compatible', evidenceIds: ['description:0'] },
    'requirement:0': { value: 'required', evidenceIds: ['description:1'] },
    'importance:0': { value: '3', evidenceIds: ['description:1'] },
    'requirement:1': { value: 'preferred', evidenceIds: ['description:2'] },
    'importance:1': { value: '1', evidenceIds: ['description:2'] },
  } };
  const analysis = await analyzeJob(gatewayFor(value), job, profile);
  assert.deepEqual(analysis.requirements.map(item => item.classification), ['required', 'preferred']);
  const match = applyJudgment(evaluateJob(job, profile), analysis, profile);
  assert.equal(match.eligible, true);
  assert.deepEqual(match.missing, ['Docker']);
});

test('claim review surfaces unsupported factual content and rejects unknown citation IDs', async () => {
  const evidence = [{ type: 'skill', value: 'Node.js', source: 'confirmed profile' }];
  const review = await reviewClaims(gatewayFor({ answers: {
    'claim:0': { value: 'supported', evidenceIds: [] },
    'claim:1': { value: 'insufficient_evidence', evidenceIds: [] },
  } }), 'Dear hiring team. I have ten years of Node.js experience.', evidence);
  assert.equal(review.claims[1].status, 'insufficient_evidence');
  await assert.rejects(() => reviewClaims(gatewayFor({ answers: {
    'claim:0': { value: 'supported', evidenceIds: ['outside:0'] },
  } }), 'Hello.', evidence), /incomplete|unsupported evidence/i);
});
