const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const empty = () => ({ techStack: [], englishLevel: '', seniority: '', goals: '', bio: '', confirmedAt: null });
const list = value => Array.isArray(value) ? [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))] : [];
const text = value => String(value || '').replace(/\s+/g, ' ').trim();

function prefillRecruiterProfile(profile, existing = {}) {
  return normaliseRecruiterProfile({
    ...empty(), ...existing,
    techStack: existing.techStack?.length ? existing.techStack : [...(profile.skills || []), ...(profile.keywords || [])],
    seniority: existing.seniority || profile.seniority || '',
  });
}

function normaliseRecruiterProfile(input = {}) {
  const profile = { ...empty(), ...input };
  profile.techStack = list(profile.techStack);
  profile.englishLevel = text(profile.englishLevel).toUpperCase();
  profile.seniority = text(profile.seniority);
  profile.goals = text(profile.goals);
  profile.bio = text(profile.bio);
  profile.confirmedAt = profile.confirmedAt ? String(profile.confirmedAt) : null;
  return profile;
}

function validateRecruiterProfile(input, { requireConfirmation = false } = {}) {
  const profile = normaliseRecruiterProfile(input);
  const errors = [];
  if (profile.englishLevel && !CEFR_LEVELS.includes(profile.englishLevel)) errors.push('English proficiency must use a CEFR level from A1 to C2.');
  if (profile.bio.length > 1200) errors.push('Bio must be 1,200 characters or fewer.');
  if (profile.goals.length > 800) errors.push('Goals must be 800 characters or fewer.');
  if (requireConfirmation && input.confirmed !== true) errors.push('Review the recruiter profile and confirm it before saving.');
  return { profile, errors };
}

module.exports = { CEFR_LEVELS, empty, normaliseRecruiterProfile, prefillRecruiterProfile, validateRecruiterProfile };
