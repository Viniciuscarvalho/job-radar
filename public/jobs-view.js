(function exposeJobResults(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JobResults = api;
}(typeof globalThis === 'undefined' ? this : globalThis, function jobResultsFactory() {
  const TIERS = ['Excellent', 'Strong', 'Potential'];

  function filterJobs(jobs, { query = '', tier = 'All' } = {}) {
    const normalizedQuery = String(query).trim().toLowerCase();
    return jobs.filter(job => {
      const matchesTier = tier === 'All' || job.match?.tier === tier;
      const searchable = `${job.company || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase();
      return matchesTier && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }

  function emptyState({ totalJobs, filteredJobs, query = '', tier = 'All' }) {
    if (filteredJobs > 0) return null;
    if (totalJobs === 0) {
      return { title: 'No eligible jobs yet', detail: 'No current jobs meet your confirmed target roles and work eligibility. Refresh jobs to search the available sources again.', canClearFilters: false, canRefresh: true };
    }
    if (String(query).trim() || tier !== 'All') {
      return { title: 'No matches for these filters', detail: 'Try a different search or clear the active filters to see all eligible jobs.', canClearFilters: true, canRefresh: false };
    }
    return null;
  }

  function scanFeedback({ found = 0, pending = 0, sources = {} } = {}) {
    const sourceResults = Object.values(sources);
    const unreachable = sourceResults.filter(source => source?.error);
    if (found === 0 && sourceResults.length > 0 && unreachable.length === sourceResults.length) return 'Job sources could not be reached. Your saved jobs are still available; try refreshing again later.';
    if (found === 0 && pending === 0) return 'No eligible jobs were found for your confirmed criteria.';
    const eligible = `${found} eligible ${found === 1 ? 'job was' : 'jobs were'} processed.`;
    const review = pending ? ` ${pending} ${pending === 1 ? 'discovery needs' : 'discoveries need'} source review before appearing as eligible.` : '';
    return `${eligible}${review} Jobs outside your required roles or eligibility are excluded.`;
  }

  return { TIERS, filterJobs, emptyState, scanFeedback };
}));
