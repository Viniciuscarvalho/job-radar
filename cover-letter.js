const { evaluateJob } = require('./matcher');
const { SKILL_ALIASES } = require('./resume-parser');

class CoverLetterError extends Error { constructor(message, status = 422) { super(message); this.status = status; } }
const normalise = value => String(value || '').toLowerCase();
const unique = values => [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];

function buildEvidence(profile, job) {
  const skills = unique([...(profile.skills || []), ...(profile.keywords || [])]);
  const matchedSkills = skills.filter(skill => normalise(`${job.title} ${job.description}`).includes(normalise(skill)) || (SKILL_ALIASES[skill] || []).some(alias => normalise(`${job.title} ${job.description}`).includes(normalise(alias))));
  return [
    ...unique(profile.roles || []).map(value => ({ type: 'target_role', value, source: 'confirmed profile' })),
    ...matchedSkills.map(value => ({ type: 'skill', value, source: 'confirmed profile and job description' })),
    ...(profile.seniority ? [{ type: 'seniority', value: profile.seniority, source: 'confirmed profile' }] : []),
  ];
}

function validateEditableContent(content, evidence) {
  const value = String(content || '').replace(/\r/g, '').trim();
  if (value.length < 80 || value.length > 5000) throw new CoverLetterError('Cover letter content must be between 80 and 5,000 characters.');
  if (/\b\d+\+?\s+years?\b|\b(?:bachelor|master|phd|degree|certified|certification)\b/i.test(value)) throw new CoverLetterError('Remove unsupported years, education, or certification claims before exporting.');
  const evidenceSkills = new Set(evidence.filter(item => item.type === 'skill').map(item => normalise(item.value)));
  const unsupported = Object.keys(SKILL_ALIASES).find(skill => normalise(value).includes(normalise(skill)) && !evidenceSkills.has(normalise(skill)));
  if (unsupported) throw new CoverLetterError(`Remove or support the ${unsupported} skill claim before exporting.`);
  return value;
}

function composeCoverLetter(profile, job) {
  const match = evaluateJob(job, profile);
  if (!match.eligible) throw new CoverLetterError('Choose an eligible job before creating a cover letter.', 403);
  const evidence = buildEvidence(profile, job);
  const skills = evidence.filter(item => item.type === 'skill').map(item => item.value);
  const role = evidence.find(item => item.type === 'target_role')?.value || 'technical professional';
  const skillsLine = skills.length ? `My confirmed profile highlights ${skills.join(', ')}, which are relevant to this role.` : 'My confirmed profile is aligned with this role, and I would welcome the chance to discuss the relevant experience in detail.';
  const content = `Dear ${job.company || 'Hiring Team'},\n\nI am applying for the ${job.title} position. My target role is ${role}, and I am interested in the opportunity to contribute to ${job.company || 'your team'}. ${skillsLine}\n\nI would value the opportunity to explain how my confirmed experience can support the needs described in this position. Thank you for considering my application.\n\nSincerely,\n${profile.name || 'Candidate'}`;
  return { content, evidence, match: { score: match.score, tier: match.tier } };
}

module.exports = { CoverLetterError, buildEvidence, composeCoverLetter, validateEditableContent };
