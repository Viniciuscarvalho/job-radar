const fs = require('fs');
const path = require('path');
const { empty, normaliseRecruiterProfile, prefillRecruiterProfile, validateRecruiterProfile } = require('./recruiter-profile');

const PROFILE_PATH = process.env.JOB_RADAR_RECRUITER_PROFILE_PATH || path.join(__dirname, 'data', 'recruiter-profile.json');

function readRecruiterProfile() {
  try { return normaliseRecruiterProfile(JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'))); } catch { return empty(); }
}

function getRecruiterProfile(profile) { return prefillRecruiterProfile(profile, readRecruiterProfile()); }

function saveRecruiterProfile(input, profile) {
  const { profile: recruiterProfile, errors } = validateRecruiterProfile(input, { requireConfirmation: true });
  if (errors.length) { const error = new Error(errors.join(' ')); error.status = 422; throw error; }
  const saved = { ...prefillRecruiterProfile(profile, recruiterProfile), confirmedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true, mode: 0o700 });
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(saved, null, 2), { mode: 0o600 });
  return saved;
}

module.exports = { PROFILE_PATH, getRecruiterProfile, readRecruiterProfile, saveRecruiterProfile };
