const { SKILL_ALIASES } = require('./resume-parser');
const { evaluateJob } = require('./matcher');

const unique = values => [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];

function createSearchPlan(profile, { maxRoles = 3, maxSkills = 8 } = {}) {
  const roles = unique(profile.roles || []).slice(0, maxRoles);
  const skills = unique([...(profile.skills || []), ...(profile.keywords || [])]).slice(0, maxSkills);
  const terms = [
    ...roles.map(value => ({ value, kind: 'role', source: 'confirmed target role' })),
    ...skills.map(value => ({ value, kind: 'skill', source: 'confirmed profile', synonyms: SKILL_ALIASES[value] || [] })),
  ];
  const queries = roles.map(role => ({
    role,
    terms: unique([role, ...skills.slice(0, 4)]),
    text: unique([role, ...skills.slice(0, 4)]).join(' '),
  }));
  const explanation = 'Search terms can broaden source discovery, but confirmed target roles and work eligibility still decide whether a job is eligible.';
  return {
    terms,
    queries,
    strictEligibility: { roles, workEligibility: unique(profile.workEligibility || []) },
    explanation,
    summary: explanation,
  };
}

function eligiblePlannedJobs(jobs, profile) {
  return (jobs || []).map(job => ({ job, match: evaluateJob(job, profile) })).filter(result => result.match.eligible);
}

module.exports = { createSearchPlan, eligiblePlannedJobs };
