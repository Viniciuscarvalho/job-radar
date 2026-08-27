const path = require('path');

const SKILL_ALIASES = {
  'Node.js': ['node.js', 'node', 'nodejs'], 'React Native': ['react native', 'rn'], TypeScript: ['typescript', 'ts'], JavaScript: ['javascript', 'js'],
  'C#': ['c#', 'csharp'], '.NET': ['.net', 'dotnet'], AWS: ['aws', 'amazon web services'], Docker: ['docker'], Kubernetes: ['kubernetes', 'k8s'],
  Python: ['python'], React: ['react'], Swift: ['swift'], SwiftUI: ['swiftui'], Kotlin: ['kotlin'], Java: ['java'], Go: ['golang', 'go'],
  SQL: ['sql'], GraphQL: ['graphql'], REST: ['rest', 'restful'], 'CI/CD': ['ci/cd', 'continuous integration', 'continuous delivery'],
};

class ResumeParseError extends Error { constructor(code, message) { super(message); this.code = code; } }
const normalise = value => String(value || '').replace(/\s+/g, ' ').trim();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const includesAlias = (text, alias) => new RegExp(`(^|[^a-z0-9.])${escape(alias.toLowerCase())}($|[^a-z0-9.])`, 'i').test(text);
const lines = text => String(text || '').split(/\r?\n/).map(normalise).filter(Boolean);
function extractSkills(text) { return Object.entries(SKILL_ALIASES).filter(([, aliases]) => aliases.some(alias => includesAlias(text, alias))).map(([skill]) => skill); }
function extractName(text) { return lines(text).find(line => line.length > 2 && line.length < 70 && !/@|https?:|linkedin|github/i.test(line)) || ''; }
function extractRoles(text) { const pattern = /(?:senior|junior|staff|principal|lead|mid-level)?\s*(?:software|frontend|backend|full[ -]?stack|mobile|ios|android|data|platform|devops|product|design)\s*(?:engineer|developer|designer|manager)/gi; return [...new Set((text.match(pattern) || []).map(normalise))].slice(0, 8); }
function profileFromText(text, filename) {
  const cleaned = normalise(text);
  if (cleaned.length < 80) throw new ResumeParseError('NO_EXTRACTABLE_TEXT', 'We could not extract enough text from this file. Use a text-based PDF/DOCX or enter your profile manually.');
  const skills = extractSkills(text);
  return { name: extractName(text), roles: extractRoles(text), skills, keywords: skills, extractedFrom: path.basename(filename || 'resume'), aliases: skills.map(skill => ({ skill, matchedAs: SKILL_ALIASES[skill] })) };
}
async function textFromDocument(buffer, filename, readers = {}) {
  const extension = path.extname(filename || '').toLowerCase();
  if (extension === '.pdf') return (await (readers.pdf || require('pdf-parse'))(buffer)).text;
  if (extension === '.docx') return (await (readers.docx || require('mammoth')).extractRawText({ buffer })).value;
  throw new ResumeParseError('UNSUPPORTED_FORMAT', 'Upload a PDF or DOCX resume.');
}
async function parseResume(buffer, filename, readers) {
  try { return profileFromText(await textFromDocument(buffer, filename, readers), filename); }
  catch (error) { if (error instanceof ResumeParseError) throw error; throw new ResumeParseError('UNREADABLE_DOCUMENT', 'We could not read this resume. Use a text-based PDF/DOCX or enter your profile manually.'); }
}
module.exports = { ResumeParseError, SKILL_ALIASES, extractSkills, profileFromText, parseResume };
