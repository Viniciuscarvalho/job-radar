const test = require('node:test');
const assert = require('node:assert/strict');
const { normaliseProfile, validateProfile } = require('../profile-store');
test('normalises editable arrays and keeps raw resume retention opt-in', () => {
  const profile = normaliseProfile({ roles: [' Senior Engineer ', 'Senior Engineer'], workEligibility: ['Brazil'], skills: ['Node.js'], keepResume: 'yes', minSalaryUsdAnnual: '-5' });
  assert.deepEqual(profile.roles, ['Senior Engineer']); assert.equal(profile.keepResume, true); assert.equal(profile.minSalaryUsdAnnual, 0);
});
test('requires both target roles and work eligibility', () => {
  assert.equal(validateProfile({}).errors.length, 2);
  assert.deepEqual(validateProfile({ roles: ['Backend Engineer'], workEligibility: ['Brazil'] }).errors, []);
});
