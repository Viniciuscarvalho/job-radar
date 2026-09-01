const { SKILL_ALIASES } = require('./resume-parser');
const { evaluateJob } = require('./matcher');

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const hasSkill = (profile, skill) => [...(profile.skills || []), ...(profile.keywords || [])].some(value => clean(value).toLowerCase() === clean(skill).toLowerCase() || (SKILL_ALIASES[skill] || []).some(alias => clean(value).toLowerCase() === clean(alias).toLowerCase()));
const requirementsFor = job => Object.keys(SKILL_ALIASES).filter(skill => new RegExp(`(^|[^a-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase()}($|[^a-z0-9])`, 'i').test(`${job.title} ${job.description}`) || (SKILL_ALIASES[skill] || []).some(alias => new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i').test(`${job.title} ${job.description}`)));

function createInterviewPlan({ profile, job, role }) {
  if (job && !evaluateJob(job, profile).eligible) { const error = new Error('Choose an eligible job for interview preparation.'); error.status = 403; throw error; }
  const selectedRole = clean(job?.title || role);
  if (!selectedRole) { const error = new Error('Choose a confirmed target role or an eligible job.'); error.status = 422; throw error; }
  if (!job && !(profile.roles || []).some(item => clean(item).toLowerCase() === selectedRole.toLowerCase())) { const error = new Error('Choose one of your confirmed target roles.'); error.status = 422; throw error; }
  const requirements = job ? requirementsFor(job) : [...(profile.skills || []), ...(profile.keywords || [])].slice(0, 6);
  const topics = requirements.map(skill => ({ topic: skill, status: hasSkill(profile, skill) ? 'known area' : 'development suggestion', priority: hasSkill(profile, skill) ? 'practice' : 'study first', reason: job ? `Listed in the selected ${job.title} description.` : `Relevant to your confirmed ${selectedRole} target.` }));
  const focus = topics.filter(topic => topic.status === 'development suggestion').slice(0, 4);
  const questionBank = [
    ...topics.slice(0, 5).map(topic => ({ category: 'technical', question: `Explain a recent approach you would use with ${topic.topic}, including trade-offs.` })),
    { category: 'system design', question: `Design a reliable service for a core workflow in a ${selectedRole} product. What would you monitor and why?` },
    { category: 'behavioral', question: 'Describe a difficult collaboration decision, the evidence you used, and what you learned.' },
    ...(profile.englishLevel && profile.englishLevel !== 'C2' ? [{ category: 'English practice', question: `In English, introduce your experience and explain why you are interested in this ${selectedRole} opportunity.` }] : []),
  ];
  return { summary: `Written preparation guidance for ${selectedRole}, based on confirmed skills and the selected job description.`, selectedRole, selectedJob: job ? { id: job.id, title: job.title, company: job.company } : null, topics, studyPlan: focus.length ? focus.map((topic, index) => `${index + 1}. Study ${topic.topic}: ${topic.reason}`) : ['1. Practice explaining your confirmed strengths with concrete, truthful examples.'], questionBank, generatedBy: 'deterministic local planner' };
}

module.exports = { createInterviewPlan, requirementsFor };
