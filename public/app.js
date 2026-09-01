let allJobs = [];
let resumeFile;
let confirmedProfile = {};

const $ = selector => document.querySelector(selector);
const { TIERS, filterJobs, emptyState, scanFeedback } = window.JobResults;
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const split = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
const safeUrl = value => /^https?:\/\//i.test(String(value || '')) ? String(value) : '#';

async function api(url, options) {
  const response = await fetch(url, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const result = isJson ? await response.json() : { error: 'The local service returned an unexpected response.' };
  if (!response.ok) throw new Error(result.error || response.statusText || 'The local service could not complete that request.');
  return result;
}

const career = window.CareerIntelligence?.create({ api, $, esc, getConfirmedProfile: () => confirmedProfile });

function setResultsMessage(message, tone = 'info') {
  const node = $('#resultsMessage');
  node.textContent = message;
  node.dataset.tone = tone;
}

function profileFromForm() {
  return { name: $('#pName').value, roles: split($('#pRoles').value), workEligibility: split($('#pEligibility').value), skills: split($('#pSkills').value), keywords: split($('#pSkills').value), minSalaryUsdAnnual: Number($('#pMinSalary').value || 0), jobTypes: split($('#pJobTypes').value), seniority: $('#pSeniority').value, workMode: $('#pWorkMode').value, excludeCompanies: split($('#pExcludedCompanies').value), keepResume: $('#keepResume').checked };
}

function fillProfile(profile = {}) {
  $('#pName').value = profile.name || '';
  $('#pRoles').value = (profile.roles || []).join(', ');
  $('#pEligibility').value = (profile.workEligibility || []).join(', ');
  $('#pSkills').value = (profile.skills || profile.keywords || []).join(', ');
  $('#pMinSalary').value = profile.minSalaryUsdAnnual || '';
  $('#pJobTypes').value = (profile.jobTypes || []).join(', ');
  $('#pSeniority').value = profile.seniority || '';
  $('#pWorkMode').value = profile.workMode || '';
  $('#pExcludedCompanies').value = (profile.excludeCompanies || []).join(', ');
  $('#keepResume').checked = Boolean(profile.keepResume);
}

function showStep(step) {
  for (const id of ['upload', 'profile', 'preferences']) $('#' + id + 'Step').classList.toggle('hidden', id !== step);
  ['step1', 'step2', 'step3'].forEach((id, index) => $('#' + id).classList.toggle('active', index <= ['upload', 'profile', 'preferences'].indexOf(step)));
}

async function loadProfile() {
  confirmedProfile = await api('/api/profile');
  fillProfile(confirmedProfile);
  career?.setConfirmedProfile(confirmedProfile);
  return confirmedProfile;
}

async function loadStats() {
  const stats = await api('/api/stats');
  $('#stats').innerHTML = ['saved', 'applied', 'interview', 'offer', 'rejected'].map(key => `<div class="stat"><b>${stats[key] || 0}</b><span>${esc(key)}</span></div>`).join('');
}

function currentFilters() { return { query: $('#search').value, tier: $('#tierFilter').value }; }
function clearFilters() { $('#search').value = ''; $('#tierFilter').value = 'All'; renderJobs(); }
function emptyJobsHtml(state) { return `<div class="panel empty-state"><h3>${esc(state.title)}</h3><p>${esc(state.detail)}</p>${state.canClearFilters ? '<button id="clearFilters" class="secondary">Clear filters</button>' : ''}</div>`; }

function jobCard(job) {
  return `<article class="job"><div class="job-top"><div><div class="company">${esc(job.company)}</div><h3>${esc(job.title)}</h3></div><div class="score ${job.match.tier.toLowerCase()}">${job.match.score}%</div></div><div class="meta"><span class="tier ${job.match.tier.toLowerCase()}">${esc(job.match.tier)}</span><span class="tag">${esc(job.location || 'Remote')}</span><span class="tag">${esc(job.source)}</span></div><div class="desc">${esc(job.description || '')}</div><div class="actions"><button class="secondary" data-job-details="${job.id}">Why this match</button><a class="btn" target="_blank" rel="noopener" href="${esc(safeUrl(job.url))}">Open role ↗</a></div></article>`;
}

function renderJobs() {
  const filters = currentFilters();
  const jobs = filterJobs(allJobs, filters);
  const state = emptyState({ totalJobs: allJobs.length, filteredJobs: jobs.length, ...filters });
  if (state) {
    $('#jobs').innerHTML = emptyJobsHtml(state);
    $('#clearFilters')?.addEventListener('click', clearFilters);
    return;
  }
  $('#jobs').innerHTML = TIERS.map(tier => {
    const items = jobs.filter(job => job.match.tier === tier);
    return items.length ? `<section class="tier-group"><h3>${tier} matches <span>${items.length}</span></h3><div class="job-list">${items.map(jobCard).join('')}</div></section>` : '';
  }).join('');
  document.querySelectorAll('[data-job-details]').forEach(button => { button.onclick = () => openJob(Number(button.dataset.jobDetails)); });
}

function showJobsError(error) {
  $('#jobs').innerHTML = `<div class="panel empty-state"><h3>Jobs could not be loaded</h3><p>${esc(error.message || 'Check that Job Radar is running, then refresh jobs.')}</p></div>`;
  setResultsMessage('We could not load jobs. Your saved jobs have not been changed.', 'error');
}

async function loadJobs() {
  try { allJobs = await api('/api/jobs'); renderJobs(); return true; }
  catch (error) { showJobsError(error); return false; }
}

function stageButtons(jobId) { return ['saved', 'applied', 'interview', 'offer', 'rejected'].map(stage => `<button class="secondary" data-stage="${stage}" data-job-id="${jobId}">${stage}</button>`).join(''); }

async function openJob(id) {
  try {
    const job = allJobs.find(item => item.id === id);
    if (!job) throw new Error('This job is no longer in the eligible list. Refresh jobs and try again.');
    const match = await api(`/api/jobs/${id}/match`);
    $('#drawerContent').innerHTML = `<div class="eyebrow">${esc(match.tier)} MATCH</div><h1>${esc(job.title)}</h1><p>${esc(job.company)} · ${esc(job.location)}</p><div class="score ${match.tier.toLowerCase()}">${match.score}%</div><h2>Score breakdown</h2><div class="breakdown"><span>Skills <b>${match.breakdown.skills}/55</b></span><span>Role <b>${match.breakdown.role}/25</b></span><span>Seniority <b>${match.breakdown.seniority}/10</b></span><span>Preferences <b>${match.breakdown.preferences}/10</b></span></div><h2>Matched evidence</h2><div class="keywords">${match.exact.map(skill => `<span class="keyword match">${esc(skill)}</span>`).join('') || '<span class="notice">No extracted skill evidence yet.</span>'}</div><h2>Requirements to verify</h2><div class="keywords">${match.gaps.map(skill => `<span class="keyword gap">${esc(skill)}</span>`).join('') || '<span class="notice">No obvious gaps detected.</span>'}</div><p class="notice">${esc(match.bullets[2])}</p><h2>Application stage</h2><div class="stage">${stageButtons(id)}</div><p><a class="btn" target="_blank" rel="noopener" href="${esc(safeUrl(job.url))}">Apply on source ↗</a></p>${career ? career.renderJobTools(job) : ''}`;
    document.querySelectorAll('[data-stage]').forEach(button => { button.onclick = () => setStage(Number(button.dataset.jobId), button.dataset.stage); });
    career?.connectJobTools(job);
    $('#drawer').classList.remove('hidden');
    $('#closeDrawer').focus();
  } catch (error) { setResultsMessage(`We could not open this job's match details: ${error.message}`, 'error'); }
}

async function setStage(jobId, stage) {
  try {
    await api('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: jobId, stage, source_submitted: stage !== 'saved' }) });
    await Promise.all([loadStats(), loadPipeline()]);
  } catch (error) { setResultsMessage(`We could not update the application stage: ${error.message}`, 'error'); }
}

async function loadPipeline() {
  const rows = await api('/api/applications');
  $('#pipeline').innerHTML = rows.length ? rows.map(row => `<div class="pipeline-row"><div><strong>${esc(row.company)}</strong><br><span>${esc(row.title)}</span></div><div>${esc(row.stage)}</div><div>${row.stillEligible ? `${row.match_score}% match` : '<span class="historic">No longer meets current criteria</span>'}</div></div>`).join('') : '<p>No tracked applications yet.</p>';
}

function readResumeFile(file) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); }

$('#parseResume').onclick = async () => {
  resumeFile = $('#masterResume').files[0];
  if (!resumeFile) { $('#resumeStatus').textContent = 'Choose a PDF or DOCX resume first.'; return; }
  const button = $('#parseResume'); button.disabled = true; $('#resumeStatus').textContent = 'Extracting locally…';
  try {
    const { draft } = await api('/api/profile/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: resumeFile.name, data: await readResumeFile(resumeFile) }) });
    fillProfile({ ...profileFromForm(), ...draft }); $('#resumeStatus').textContent = 'Profile extracted. Review every field before continuing.'; showStep('profile');
  } catch (error) { $('#resumeStatus').textContent = `${error.message} You can enter your profile manually.`; }
  finally { button.disabled = false; }
};

$('#manualProfile').onclick = () => { $('#resumeStatus').textContent = 'Manual profile selected.'; showStep('profile'); };
$('#toPreferences').onclick = () => { const profile = profileFromForm(); if (!profile.roles.length || !profile.workEligibility.length) { $('#resumeStatus').textContent = 'Target roles and work eligibility/location are required.'; return; } showStep('preferences'); };
$('#findMatches').onclick = async () => {
  const button = $('#findMatches'); button.disabled = true; button.textContent = 'Finding matches…';
  try {
    const profile = profileFromForm();
    const resume = profile.keepResume && resumeFile ? { name: resumeFile.name, data: await readResumeFile(resumeFile) } : undefined;
    const result = await api('/api/onboarding/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, resume }) });
    const [profileResult, jobsLoaded, statsResult, pipelineResult] = await Promise.allSettled([loadProfile(), loadJobs(), loadStats(), loadPipeline()]);
    if (!jobsLoaded.value) return;
    const message = scanFeedback(result.scan);
    setResultsMessage([profileResult, statsResult, pipelineResult].some(item => item.status === 'rejected') ? `${message} Some local data could not be refreshed.` : message);
    career?.load();
  } catch (error) { $('#resumeStatus').textContent = error.message; showStep('profile'); }
  finally { button.disabled = false; button.textContent = 'Find my matches'; }
};

$('#backToUpload').onclick = () => showStep('upload');
$('#backToProfile').onclick = () => showStep('profile');
$('#scanBtn').onclick = async () => {
  const button = $('#scanBtn'); button.disabled = true; button.textContent = 'Refreshing jobs…';
  try { const result = await api('/api/scan', { method: 'POST' }); if (await loadJobs()) setResultsMessage(scanFeedback(result)); }
  catch (error) { setResultsMessage(`We could not refresh jobs: ${error.message}`, 'error'); }
  finally { button.disabled = false; button.textContent = 'Refresh jobs'; }
};

$('#search').oninput = renderJobs;
$('#tierFilter').onchange = renderJobs;
$('#closeDrawer').onclick = () => $('#drawer').classList.add('hidden');
$('#drawer').onclick = event => { if (event.target === $('#drawer')) $('#drawer').classList.add('hidden'); };
document.addEventListener('keydown', event => { if (event.key === 'Escape') $('#drawer').classList.add('hidden'); });

showStep('upload');
career?.bind();
Promise.allSettled([loadProfile(), loadStats(), loadJobs(), loadPipeline(), career?.load()]).then(results => {
  if (results.some(result => result.status === 'rejected')) setResultsMessage('Some local data could not load. Refresh jobs to try again.', 'error');
});
