const db = require('./db');
const { evaluateJob } = require('./matcher');
const { getProfile } = require('./profile-store');
const { createSearchPlan } = require('./search-intelligence');
const UA = 'JobRadar/3.0 (+open-source local job search tool)';
const clean = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function relevant(job, profile = getProfile()) { return evaluateJob(job, profile).eligible; }
async function fetchJson(url, options = {}) { const response = await fetch(url, { ...options, headers: { 'User-Agent': UA, ...(options.headers || {}) } }); if (!response.ok) throw new Error(`${response.status} ${url}`); return response.json(); }
async function remotive() { const profile = getProfile(); const plan = createSearchPlan(profile); const queries = plan.queries.length ? plan.queries : [{ text: profile.skills[0] || 'software engineer' }]; const results = await Promise.all(queries.map(async query => (await fetchJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query.text)}`)).jobs || [])); const seen = new Set(); return results.flat().filter(job => !seen.has(job.url) && seen.add(job.url)).map(job => ({ company: job.company_name, title: job.title, location: job.candidate_required_location || 'Remote', region: job.candidate_required_location || 'Remote', source: 'Remotive', posted: (job.publication_date || '').slice(0, 10), salary: job.salary || 'Not disclosed', url: job.url, description: clean(job.description).slice(0, 6000), open: true })); }
async function remoteok() { const data = await fetchJson('https://remoteok.com/api'); return (Array.isArray(data) ? data.slice(1) : []).map(job => ({ company: job.company || 'Unknown', title: job.position || '', location: job.location || 'Remote', region: job.location || 'Remote', source: 'RemoteOK', posted: job.date ? String(job.date).slice(0, 10) : '', salary: job.salary_min || job.salary_max ? `$${job.salary_min || '?'}–$${job.salary_max || '?'} / year` : 'Not disclosed', url: job.url || job.apply_url, description: clean(`${job.description || ''} ${(job.tags || []).join(' ')}`).slice(0, 6000), open: true })); }
const uniqueJobs = jobs => { const seen = new Set(); return jobs.filter(job => job.url && !seen.has(job.url) && seen.add(job.url)); };
const queryRoles = profile => { const roles = createSearchPlan(profile).queries.map(query => query.role); return roles.length ? roles : [profile.skills?.[0] || 'software engineer']; };
const dateFromEpoch = value => Number.isFinite(Number(value)) ? new Date(Number(value) * 1000).toISOString().slice(0, 10) : '';
const salary = job => job.minSalary || job.maxSalary ? `${job.currency || 'USD'} ${job.minSalary || '?'}–${job.maxSalary || '?'} / ${job.salaryPeriod || 'year'}` : 'Not disclosed';

async function himalayas({ fetchJsonFn = fetchJson, profile = getProfile() } = {}) {
  const results = await Promise.all(queryRoles(profile).map(role => fetchJsonFn(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(role)}&sort=recent`)));
  return uniqueJobs(results.flatMap(data => data.jobs || []).map(job => ({
    company: job.companyName || 'Unknown', title: job.title || '', location: (job.locationRestrictions || []).join(', ') || 'Remote', region: (job.locationRestrictions || []).join(', ') || 'Remote',
    source: 'Himalayas', posted: dateFromEpoch(job.pubDate), salary: salary(job), url: job.applicationLink || job.guid,
    description: clean(job.description || job.excerpt || '').slice(0, 6000), open: true,
  })));
}

async function jobicy({ fetchJsonFn = fetchJson, profile = getProfile() } = {}) {
  const results = await Promise.all(queryRoles(profile).map(role => fetchJsonFn(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(role)}`)));
  return uniqueJobs(results.flatMap(data => data.jobs || []).map(job => ({
    company: job.companyName || 'Unknown', title: job.jobTitle || '', location: job.jobGeo || 'Remote', region: job.jobGeo || 'Remote',
    source: 'Jobicy', posted: String(job.pubDate || '').slice(0, 10), salary: 'Not disclosed', url: job.url,
    description: clean(job.jobDescription || job.jobExcerpt || '').slice(0, 6000), open: true,
  })));
}
function upsert(job) {
  const match = evaluateJob(job);
  if (!job.url || (!match.eligible && !match.needsReview)) return false;
  db.prepare(`INSERT INTO jobs(company,title,location,region,source,posted,salary,url,description,open,match_score,matched_keywords,missing_keywords,location_provenance,search_context,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET company=excluded.company,title=excluded.title,location=excluded.location,
    region=excluded.region,source=excluded.source,posted=excluded.posted,salary=excluded.salary,
    description=excluded.description,open=1,match_score=excluded.match_score,matched_keywords=excluded.matched_keywords,
    missing_keywords=excluded.missing_keywords,location_provenance=excluded.location_provenance,
    search_context=excluded.search_context,updated_at=CURRENT_TIMESTAMP`).run(
      job.company, job.title, job.location, job.region, job.source, job.posted, job.salary, job.url,
      job.description, job.open ? 1 : 0, match.score, JSON.stringify(match.matched), JSON.stringify(match.missing),
      job.location_provenance || 'source', job.search_context || '');
  return match.eligible ? 'eligible' : 'review';
}
async function scan() { const id = db.prepare('INSERT INTO scans DEFAULT VALUES').run().lastInsertRowid; const sources = {}; let found = 0; let pending = 0; for (const [name, source] of [['Remotive', remotive], ['RemoteOK', remoteok], ['Himalayas', himalayas], ['Jobicy', jobicy]]) { try { const jobs = await source(); sources[name] = { fetched: jobs.length, accepted: 0, pending: 0 }; for (const job of jobs) { const result = upsert(job); if (result === 'eligible') { found++; sources[name].accepted++; } else if (result === 'review') { pending++; sources[name].pending++; } } } catch (error) { sources[name] = { error: error.message }; } } db.prepare('UPDATE scans SET completed_at=CURRENT_TIMESTAMP,found_count=?,source_summary=? WHERE id=?').run(found, JSON.stringify(sources), id); return { found, pending, sources }; }
if (require.main === module) scan().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error); process.exit(1); });
module.exports = { himalayas, jobicy, relevant, scan, upsert };
