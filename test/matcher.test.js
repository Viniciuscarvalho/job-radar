const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateJob } = require('../matcher');
const profile = { roles: ['Senior Backend Engineer'], workEligibility: ['Brazil', 'Worldwide'], skills: ['TypeScript', 'Node.js', 'AWS'], keywords: [], seniority: 'Senior', workMode: 'Remote', jobTypes: ['Full-time'], minSalaryUsdAnnual: 1, excludeCompanies: [] };
const job = { company: 'Acme', title: 'Senior Backend Engineer', location: 'Brazil / Remote', region: 'Worldwide', salary: '$120,000 USD', description: 'Full-time Remote role using TypeScript, Node.js and AWS.' };
test('strictly excludes a job outside the target role or eligibility', () => {
  assert.equal(evaluateJob({ ...job, title: 'Product Designer' }, profile).eligible, false);
  assert.equal(evaluateJob({ ...job, location: 'United States only', region: 'United States' }, profile).eligible, false);
});
test('keeps a generic remote role pending instead of inventing worldwide eligibility', () => {
  const result = evaluateJob({ ...job, location: 'Remote', region: 'Remote' }, { ...profile, workEligibility: ['Worldwide'] });
  assert.equal(result.eligible, false);
  assert.equal(result.eligibility.status, 'unspecified');
  assert.equal(result.needsReview, true);
});
test('explains transparent weighted excellent matching', () => {
  const result = evaluateJob(job, profile);
  assert.equal(result.eligible, true); assert.equal(result.tier, 'Excellent'); assert.deepEqual(result.breakdown, { skills: 55, role: 25, seniority: 10, preferences: 10 }); assert.deepEqual(result.missing, []);
});
