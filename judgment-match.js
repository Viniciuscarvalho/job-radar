const { hasSkill } = require('./matcher');

function applyJudgment(base, analysis, profile) {
  if (!analysis) return base;

  const roleMatches = Boolean(analysis.role?.targetRole);
  const eligibilityMatches = analysis.eligibility?.value === 'explicitly_compatible';
  const requirements = (analysis.requirements || []).filter(item => ['required', 'preferred'].includes(item.classification));
  const matched = requirements.filter(item => hasSkill(profile, item.skill)).map(item => item.skill);
  const missing = requirements.filter(item => !hasSkill(profile, item.skill)).map(item => item.skill);
  const skillScore = requirements.length ? matched.length / requirements.length : 0;
  const excluded = base.reasons.includes('Company is excluded.');
  const eligible = !excluded && roleMatches && eligibilityMatches;
  const score = eligible ? Math.round((skillScore * 55 + 25 + base.breakdown.seniority + base.breakdown.preferences) * 100) / 100 : 0;
  const tier = score >= 85 ? 'Excellent' : score >= 70 ? 'Strong' : 'Potential';
  const reasons = [
    ...(excluded ? ['Company is excluded.'] : []),
    ...(!roleMatches ? ['Confirmed target role is not established by the source.'] : []),
    ...(!eligibilityMatches ? ['Work eligibility is not explicitly compatible in the source.'] : []),
  ];
  return {
    ...base,
    eligible,
    needsReview: !eligible && !excluded && analysis.eligibility?.value !== 'explicitly_incompatible',
    reasons,
    score,
    tier,
    matched,
    missing,
    breakdown: { ...base.breakdown, skills: Math.round(skillScore * 55), role: roleMatches ? 25 : 0 },
    analysis,
  };
}

module.exports = { applyJudgment };
