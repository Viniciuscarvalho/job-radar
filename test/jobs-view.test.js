const test = require('node:test');
const assert = require('node:assert/strict');
const { filterJobs, emptyState, scanFeedback } = require('../public/jobs-view');
const { buildServer } = require('../server');

const jobs = [
  { company: 'Northwind', title: 'Backend Engineer', description: 'Node.js and TypeScript', match: { tier: 'Excellent' } },
  { company: 'Contoso', title: 'Platform Engineer', description: 'Kubernetes', match: { tier: 'Strong' } },
];

test('filters eligible jobs by text and match tier without mutating the original list', () => {
  const filtered = filterJobs(jobs, { query: 'node', tier: 'Excellent' });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].company, 'Northwind');
  assert.equal(jobs.length, 2);
});

test('explains whether no jobs are eligible or the active filters found none', () => {
  assert.deepEqual(emptyState({ totalJobs: 0, filteredJobs: 0, query: '', tier: 'All' }), {
    title: 'No eligible jobs yet',
    detail: 'No current jobs meet your confirmed target roles and work eligibility.',
    canClearFilters: false,
  });
  assert.deepEqual(emptyState({ totalJobs: 2, filteredJobs: 0, query: 'designer', tier: 'All' }), {
    title: 'No matches for these filters',
    detail: 'Try a different search or clear the active filters to see all eligible jobs.',
    canClearFilters: true,
  });
});

test('distinguishes unreachable job sources from an empty successful refresh', () => {
  assert.match(scanFeedback({ found: 0, sources: { Remotive: { error: 'timeout' } } }), /could not be reached/i);
  assert.match(scanFeedback({ found: 0, sources: { Remotive: { found: 0 } } }), /No eligible jobs were found/i);
});

test('serves the accessible filter controls and the jobs-results module', async () => {
  const server = buildServer({ scanRunner: async () => ({ found: 0, sources: {} }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const [page, module] = await Promise.all([
    fetch(`${base}/`).then(response => response.text()),
    fetch(`${base}/jobs-view.js`).then(response => response.text()),
  ]);
  await new Promise(resolve => server.close(resolve));

  assert.match(page, /id="resultsMessage" role="status" aria-live="polite"/);
  assert.match(page, /id="tierFilter" aria-label="Filter by match tier"/);
  assert.match(page, /script src="jobs-view\.js"/);
  assert.match(module, /function scanFeedback/);
});
