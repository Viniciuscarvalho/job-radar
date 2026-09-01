const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

class LocalAiError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function localRuntimeUrl(value = process.env.JOB_RADAR_LOCAL_AI_URL || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434') {
  let url;
  try { url = new URL(value); } catch { throw new LocalAiError('LOCAL_AI_CONFIGURATION', 'The local AI runtime URL is invalid. Use a loopback URL such as http://127.0.0.1:11434.', 422); }
  if (!['http:', 'https:'].includes(url.protocol) || !LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) {
    throw new LocalAiError('LOCAL_AI_NON_LOCAL', 'Job Radar only connects to an AI runtime on this computer. Configure a loopback URL such as http://127.0.0.1:11434.', 422);
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

function unavailable(message = 'Start a local Ollama-compatible runtime, then try again. Job Radar will not send your profile to a cloud service.') {
  return new LocalAiError('LOCAL_AI_UNAVAILABLE', `Local AI is unavailable. ${message}`);
}

class LocalAiGateway {
  constructor({ baseUrl, model = process.env.JOB_RADAR_LOCAL_AI_MODEL || 'llama3.2', fetchFn = globalThis.fetch } = {}) {
    this.baseUrl = localRuntimeUrl(baseUrl);
    this.model = String(model || '').trim();
    this.fetchFn = fetchFn;
  }

  endpoint(pathname) { return new URL(pathname, `${this.baseUrl.toString()}/`).toString(); }

  async status() {
    try {
      const response = await this.fetchFn(this.endpoint('api/tags'), { headers: { Accept: 'application/json' } });
      if (!response.ok) { const message = unavailable(`The runtime responded with ${response.status}. Start or check the local runtime, then try again.`).message; return { available: false, model: this.model, error: message, message }; }
      const data = await response.json();
      const models = (data.models || []).map(item => item.name).filter(Boolean);
      const modelAvailable = models.some(name => name === this.model || name.startsWith(`${this.model}:`));
      if (!modelAvailable) { const message = `Local AI is running, but the ${this.model} model is not installed. Install it in your local runtime, then try again.`; return { available: false, runtimeAvailable: true, model: this.model, installedModels: models, modelAvailable, endpoint: this.baseUrl.toString(), error: message, message }; }
      return { available: true, runtimeAvailable: true, model: this.model, installedModels: models, modelAvailable, endpoint: this.baseUrl.toString() };
    } catch {
      const message = unavailable().message; return { available: false, model: this.model, error: message, message };
    }
  }

  async generate({ system = '', prompt, temperature = 0.2 } = {}) {
    if (!String(prompt || '').trim()) throw new LocalAiError('LOCAL_AI_PROMPT_REQUIRED', 'Provide a prompt before requesting a local AI suggestion.', 422);
    let response;
    try {
      response = await this.fetchFn(this.endpoint('api/generate'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: this.model, system: String(system), prompt: String(prompt), stream: false, options: { temperature } }),
      });
    } catch { throw unavailable(); }
    let data;
    try { data = await response.json(); } catch { throw unavailable('The local runtime returned an unreadable response. Check its setup, then try again.'); }
    if (!response.ok) throw unavailable(data.error ? `The local runtime reported: ${data.error}` : `The local runtime responded with ${response.status}.`);
    const text = String(data.response || '').trim();
    if (!text) throw unavailable('The local runtime returned an empty suggestion. Check the selected model, then try again.');
    return { text, model: this.model, localOnly: true };
  }
}

module.exports = { LocalAiError, LocalAiGateway, localRuntimeUrl, unavailable };
