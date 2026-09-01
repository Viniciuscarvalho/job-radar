(function exposeCareerIntelligence(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CareerIntelligence = api;
}(typeof globalThis === 'undefined' ? this : globalThis, function careerIntelligenceFactory() {
  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Principal', 'Leadership'];

  const asList = value => Array.isArray(value) ? value : [];
  const text = value => String(value || '');
  const escapeHtml = value => text(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const options = (values, selected, placeholder) => [`<option value="">${placeholder}</option>`, ...values.map(value => `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`)].join('');

  function normalizeProfile(input = {}) {
    return {
      techStack: asList(input.techStack || input.tech_stack),
      englishProficiency: text(input.englishProficiency || input.englishLevel || input.english_proficiency || input.english_level),
      seniority: text(input.seniority),
      goals: text(input.goals),
      bio: text(input.bio),
      confirmed: Boolean(input.confirmed || input.confirmedAt || input.confirmed_at)
    };
  }

  function draftFromResponse(response = {}) {
    const draft = response.draft || response.coverLetter || response;
    return {
      content: text(draft.content || draft.body || draft.text),
      evidence: asList(draft.evidence || response.evidence),
      approved: Boolean(draft.approved || response.approved)
    };
  }

  function planFromResponse(response = {}) {
    const plan = response.plan || response;
    return {
      summary: text(plan.summary || plan.overview),
      studyTopics: asList(plan.studyTopics || plan.topics || plan.studyPlan || plan.study_plan),
      questions: asList(plan.questions || plan.questionBank || plan.question_bank)
    };
  }

  function create({ api, $, esc = escapeHtml, getConfirmedProfile = () => ({}) }) {
    let aiStatus = { available: false, message: 'Checking local AI availability…' };
    let careerProfile = normalizeProfile();

    const setStatus = (selector, message, tone = 'info') => {
      const node = $(selector);
      if (!node) return;
      node.textContent = message;
      node.dataset.tone = tone;
    };
    const aiAvailable = () => Boolean(aiStatus.available);
    const formProfile = () => normalizeProfile({
      techStack: $('#careerTechStack')?.value.split(',').map(item => item.trim()).filter(Boolean),
      englishProficiency: $('#careerEnglish')?.value,
      seniority: $('#careerSeniority')?.value,
      goals: $('#careerGoals')?.value,
      bio: $('#careerBio')?.value,
      confirmed: careerProfile.confirmed
    });
    const careerProfilePayload = (profile, confirmed = false) => ({
      techStack: profile.techStack,
      englishLevel: profile.englishProficiency,
      seniority: profile.seniority,
      goals: profile.goals,
      bio: profile.bio,
      confirmed
    });

    function renderAiStatus() {
      const node = $('#aiStatus');
      if (!node) return;
      const message = aiAvailable()
        ? aiStatus.message || 'Local AI is ready. Your career content stays on this device.'
        : aiStatus.message || 'Local AI is unavailable. You can still edit and save your profile manually.';
      node.textContent = message;
      node.dataset.tone = aiAvailable() ? 'success' : 'warning';
      $('#generateProfileSuggestions')?.toggleAttribute('disabled', !aiAvailable());
    }

    function renderCareerProfile() {
      const techStack = $('#careerTechStack');
      if (!techStack) return;
      techStack.value = careerProfile.techStack.join(', ');
      $('#careerEnglish').innerHTML = options(CEFR_LEVELS, careerProfile.englishProficiency, 'Select a CEFR level');
      $('#careerSeniority').innerHTML = options(SENIORITY_LEVELS, careerProfile.seniority, 'Select seniority');
      $('#careerGoals').value = careerProfile.goals;
      $('#careerBio').value = careerProfile.bio;
      $('#exportCareerProfile').disabled = !careerProfile.confirmed;
      $('#careerProfileConfirmation').textContent = careerProfile.confirmed
        ? 'Confirmed locally. Edit anything, then save to confirm a new version.'
        : 'Review these fields before saving. Nothing here is public or shared.';
    }

    function renderSuggestions(suggestions, rationale = []) {
      const container = $('#careerSuggestions');
      if (!container) return;
      const normalized = normalizeProfile(suggestions);
      const pieces = [
        normalized.techStack.length && `<li><strong>Tech stack:</strong> ${esc(normalized.techStack.join(', '))}</li>`,
        normalized.englishProficiency && `<li><strong>English:</strong> ${esc(normalized.englishProficiency)}</li>`,
        normalized.seniority && `<li><strong>Seniority:</strong> ${esc(normalized.seniority)}</li>`,
        normalized.goals && `<li><strong>Goals:</strong> ${esc(normalized.goals)}</li>`,
        normalized.bio && `<li><strong>Bio:</strong> ${esc(normalized.bio)}</li>`
      ].filter(Boolean).join('');
      if (!pieces) { container.innerHTML = '<p class="notice">The local model did not return usable suggestions. You can keep editing manually.</p>'; return; }
      container.innerHTML = `<div class="suggestion-card"><h3>Review local AI suggestions</h3><ul>${pieces}</ul>${rationale.length ? `<p class="notice">${esc(rationale.join(' '))}</p>` : ''}<button type="button" class="secondary" id="applyProfileSuggestions">Apply to editable fields</button></div>`;
      $('#applyProfileSuggestions').onclick = () => {
        careerProfile = { ...formProfile(), ...normalized, confirmed: false };
        renderCareerProfile();
        setStatus('#careerProfileStatus', 'Suggestions applied to editable fields. Review them, then save your confirmed profile.', 'success');
      };
    }

    async function loadAiStatus() {
      try {
        aiStatus = await api('/api/ai/status');
      } catch (error) {
        aiStatus = { available: false, message: 'Local AI is not available yet. You can use every manual profile field and still match jobs.' };
      }
      renderAiStatus();
      return aiStatus;
    }

    async function loadCareerProfile() {
      try {
        const response = await api('/api/career-profile');
        careerProfile = normalizeProfile(response.profile || response);
        renderCareerProfile();
      } catch (error) {
        careerProfile = normalizeProfile();
        renderCareerProfile();
        setStatus('#careerProfileStatus', 'A recruiter profile has not been created yet. Start with the fields you want recruiters to see.', 'info');
      }
      return careerProfile;
    }

    async function saveCareerProfile() {
      const profile = formProfile();
      const button = $('#saveCareerProfile');
      button.disabled = true;
      setStatus('#careerProfileStatus', 'Saving your confirmed recruiter profile locally…');
      try {
        const response = await api('/api/career-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(careerProfilePayload(profile, true)) });
        careerProfile = normalizeProfile(response.profile || response);
        careerProfile.confirmed = true;
        renderCareerProfile();
        setStatus('#careerProfileStatus', 'Recruiter profile confirmed and saved locally. It is not published or shared.', 'success');
      } catch (error) {
        setStatus('#careerProfileStatus', `We could not save the recruiter profile: ${error.message}`, 'error');
      } finally {
        button.disabled = false;
      }
    }

    async function suggestCareerProfile() {
      if (!aiAvailable()) { setStatus('#careerProfileStatus', 'Local AI is unavailable. You can continue editing the recruiter profile manually.', 'warning'); return; }
      const button = $('#generateProfileSuggestions');
      button.disabled = true;
      setStatus('#careerProfileStatus', 'Creating suggestions from your confirmed job-search profile…');
      try {
        const response = await api('/api/career-profile/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: getConfirmedProfile(), careerProfile: careerProfilePayload(formProfile()) }) });
        renderSuggestions(response.suggestion || response.suggestions || response.profile || response, asList(response.rationale));
        setStatus('#careerProfileStatus', 'Suggestions are ready for review. They have not changed your confirmed profile.', 'success');
      } catch (error) {
        setStatus('#careerProfileStatus', `Local AI could not create suggestions: ${error.message} You can keep editing manually.`, 'error');
      } finally {
        button.disabled = false;
      }
    }

    async function exportCareerProfile() {
      const button = $('#exportCareerProfile');
      if (!careerProfile.confirmed) { setStatus('#careerProfileStatus', 'Review and save the recruiter profile before exporting it.', 'warning'); return; }
      button.disabled = true;
      setStatus('#careerProfileStatus', 'Creating your local recruiter-profile PDF…');
      try {
        const response = await api('/api/career-profile/export', { method: 'POST' });
        const url = response.document?.downloadUrl || response.downloadUrl;
        if (!url) throw new Error('The local service did not return a PDF download.');
        window.open(url, '_blank', 'noopener');
        setStatus('#careerProfileStatus', 'Profile PDF ready in a new tab. It remains local until you choose to share it.', 'success');
      } catch (error) {
        setStatus('#careerProfileStatus', `We could not export the profile PDF: ${error.message}`, 'error');
      } finally {
        button.disabled = !careerProfile.confirmed;
      }
    }

    async function loadSearchIntelligence() {
      const container = $('#searchIntelligenceTerms');
      if (!container) return;
      try {
        const response = await api('/api/search-intelligence');
        const terms = asList(response.terms || response.searchTerms || response.queries);
        if (!terms.length) throw new Error('No terms available');
        container.innerHTML = terms.map(item => {
          const term = typeof item === 'string' ? item : item.normalized || item.term || item.value;
          const source = typeof item === 'string' ? '' : item.source ? ` <span>${esc(item.source)}</span>` : '';
          return `<li><strong>${esc(term)}</strong>${source}</li>`;
        }).join('');
        setStatus('#searchIntelligenceStatus', response.summary || 'These terms are transparent additions to your confirmed profile. Eligibility remains strict.', 'success');
      } catch (error) {
        container.innerHTML = '<li>Search terms will appear after your confirmed profile is available.</li>';
        setStatus('#searchIntelligenceStatus', 'Search intelligence is unavailable right now. Matching continues with your confirmed roles, skills, and eligibility.', 'warning');
      }
    }

    function renderCoverLetter(job) {
      return `<section class="career-tool" aria-labelledby="coverLetterTitle"><div class="tool-heading"><div><div class="eyebrow">LOCAL APPLICATION WRITER</div><h2 id="coverLetterTitle">Cover letter</h2></div><span class="privacy-badge">Stays on this device</span></div><p>Generate an evidence-bound draft for this specific role. Review and approve it before exporting a PDF.</p><p class="notice" id="coverLetterStatus" role="status" aria-live="polite">Select Generate draft to start. Job Radar will not submit it for you.</p><textarea id="coverLetterDraft" rows="14" aria-label="Editable cover letter draft" placeholder="Your approved, editable cover letter will appear here."></textarea><div class="actions"><button type="button" id="generateCoverLetter">Generate draft</button><button type="button" id="approveCoverLetter" class="secondary" disabled>Approve draft</button><button type="button" id="exportCoverLetter" class="secondary" disabled>Export PDF</button></div><p class="notice">The original application page opens separately; Job Radar never auto-applies.</p></section>`;
    }

    function renderInterviewPlan() {
      return `<section class="career-tool" aria-labelledby="interviewPlanTitle"><div class="tool-heading"><div><div class="eyebrow">LOCAL INTERVIEW COACH</div><h2 id="interviewPlanTitle">Study plan and question bank</h2></div><span class="privacy-badge">Written guidance</span></div><p>Get a written study plan and practice questions for this role. It is guidance, not an assessment or interview simulation.</p><p class="notice" id="interviewPlanStatus" role="status" aria-live="polite">Generate a plan after reviewing the job match.</p><div id="interviewPlanContent"></div><div class="actions"><button type="button" id="generateInterviewPlan">Create study plan</button></div></section>`;
    }

    function renderStudyPlan(response) {
      const plan = planFromResponse(response);
      const target = $('#interviewPlanContent');
      if (!target) return;
      target.innerHTML = `<div class="study-plan">${plan.summary ? `<p>${esc(plan.summary)}</p>` : ''}<h3>What to study</h3>${plan.studyTopics.length ? `<ol>${plan.studyTopics.map(topic => `<li>${esc(typeof topic === 'string' ? topic : topic.title || topic.topic || JSON.stringify(topic))}</li>`).join('')}</ol>` : '<p class="notice">No study priorities were returned.</p>'}<h3>Practice questions</h3>${plan.questions.length ? `<ol>${plan.questions.map(question => `<li>${esc(typeof question === 'string' ? question : question.question || question.prompt || JSON.stringify(question))}</li>`).join('')}</ol>` : '<p class="notice">No practice questions were returned.</p>'}</div>`;
    }

    function connectJobTools(job) {
      const draft = $('#coverLetterDraft');
      const generate = $('#generateCoverLetter');
      const approve = $('#approveCoverLetter');
      const exportPdf = $('#exportCoverLetter');
      let approved = false;
      let draftId = null;
      if (generate) generate.onclick = async () => {
        generate.disabled = true;
        setStatus('#coverLetterStatus', aiAvailable() ? 'Drafting a cover letter from confirmed local profile evidence…' : 'Local AI is unavailable, so Job Radar is creating a deterministic local draft from confirmed evidence.', 'warning');
        try {
          const response = await api(`/api/jobs/${job.id}/cover-letter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useAi: aiAvailable() }) });
          const coverLetter = draftFromResponse(response);
          draftId = response.draft?.id || response.draftId || null;
          draft.value = coverLetter.content;
          approved = coverLetter.approved;
          approve.disabled = !draft.value;
          exportPdf.disabled = !approved;
          setStatus('#coverLetterStatus', approved ? 'This draft is already approved. You may export it as a PDF.' : 'Draft ready. Edit it, then explicitly approve before PDF export.', 'success');
        } catch (error) {
          setStatus('#coverLetterStatus', `Local AI could not create a draft: ${error.message} You can write one manually.`, 'error');
        } finally {
          generate.disabled = false;
        }
      };
      if (draft) draft.oninput = () => { approved = false; approve.disabled = !draft.value.trim(); exportPdf.disabled = true; if (draft.value.trim()) setStatus('#coverLetterStatus', 'Draft changed. Review and approve this version before PDF export.'); };
      if (approve) approve.onclick = async () => {
        if (!draft.value.trim()) return;
        approve.disabled = true;
        setStatus('#coverLetterStatus', 'Saving your reviewed draft locally…');
        try {
          if (!draftId) throw new Error('Generate a local draft before approval.');
          const response = await api(`/api/cover-letters/${draftId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draft.value }) });
          draftId = response.draft?.id || response.id || draftId;
          approved = true;
          exportPdf.disabled = false;
          setStatus('#coverLetterStatus', 'Draft approved. You can now export the reviewed version as a local PDF.', 'success');
        } catch (error) {
          setStatus('#coverLetterStatus', `We could not save this reviewed draft: ${error.message}`, 'error');
        } finally {
          approve.disabled = !draft.value.trim();
        }
      };
      if (exportPdf) exportPdf.onclick = async () => {
        if (!approved) return;
        exportPdf.disabled = true;
        setStatus('#coverLetterStatus', 'Creating your local PDF…');
        try {
          if (!draftId) throw new Error('Generate and approve a local draft before exporting.');
          const response = await api(`/api/jobs/${job.id}/cover-letter/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftId, approved: true }) });
          const url = response.document?.downloadUrl || response.url || response.downloadUrl || response.pdfUrl;
          if (url) window.open(url, '_blank', 'noopener');
          setStatus('#coverLetterStatus', url ? 'PDF ready in a new tab. Attach it only if you choose to apply.' : 'PDF was generated locally. Your browser may prompt you to save it.', 'success');
        } catch (error) {
          setStatus('#coverLetterStatus', `We could not export the PDF: ${error.message}`, 'error');
        } finally {
          exportPdf.disabled = false;
        }
      };
      const generatePlan = $('#generateInterviewPlan');
      if (generatePlan) generatePlan.onclick = async () => {
        generatePlan.disabled = true;
        setStatus('#interviewPlanStatus', aiAvailable() ? 'Building study priorities and practice questions for this role…' : 'Local AI is unavailable. Job Radar is creating deterministic written guidance from the selected job.', 'warning');
        try {
          const response = await api(`/api/jobs/${job.id}/interview-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ careerProfile: formProfile() }) });
          renderStudyPlan(response);
          setStatus('#interviewPlanStatus', 'Your study plan and question bank are ready to review.', 'success');
        } catch (error) {
          setStatus('#interviewPlanStatus', `We could not create a study plan: ${error.message}`, 'error');
        } finally {
          generatePlan.disabled = false;
        }
      };
    }

    function bind() {
      $('#saveCareerProfile').onclick = saveCareerProfile;
      $('#generateProfileSuggestions').onclick = suggestCareerProfile;
      $('#exportCareerProfile').onclick = exportCareerProfile;
    }

    return {
      bind,
      load: async () => { await Promise.all([loadAiStatus(), loadCareerProfile(), loadSearchIntelligence()]); },
      setConfirmedProfile: profile => { if (profile && Object.keys(profile).length) getConfirmedProfile = () => profile; },
      renderJobTools: job => `${renderCoverLetter(job)}${renderInterviewPlan()}`,
      connectJobTools,
      loadAiStatus,
      normalizeProfile,
      draftFromResponse,
      planFromResponse
    };
  }

  return { CEFR_LEVELS, SENIORITY_LEVELS, normalizeProfile, draftFromResponse, planFromResponse, create };
}));
