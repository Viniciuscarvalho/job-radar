# Job Radar

**A private, local-first job radar that turns a confirmed resume profile into explainable job matches.**

[![Node.js 22+](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Privacy: local-first](https://img.shields.io/badge/privacy-local--first-7b2cbf.svg)](#privacy)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#contributing)

Job Radar is an open-source career dashboard for people who want to discover remote roles without uploading their resume to an AI service or opaque matching platform. It extracts an editable profile locally, applies the job-search criteria the person confirms, explains every ranking, and keeps application tracking on their own machine.

## Why Job Radar?

- **Own your search data:** resume parsing, profile data, SQLite data, and application history stay local by default.
- **Review before matching:** resume extraction creates an editable draft; no job scan starts until the person confirms it.
- **See why a role appears:** every result exposes matched skills, requirements to verify, and a visible score breakdown.
- **Avoid irrelevant roles:** target roles and work eligibility/location are strict filters, not weak score boosts.
- **Keep the human in control:** Job Radar opens the original job source for applications and tracks progress locally; it never auto-applies or invents experience.

## When to use it

Use Job Radar when you want a lightweight, self-hosted way to prioritize remote opportunities and maintain a personal application pipeline.

It is not an employer ATS, an account-based SaaS product, an OCR tool for scanned resumes, or an automated job-application bot. It currently supports one local profile per installation.

## Quick start

Requirements: Node.js 22+ and an internet connection when scanning public job sources. Career suggestions additionally need an Ollama-compatible runtime running on this computer; manual profile editing, deterministic cover-letter drafts, and written study guidance remain available without it.

```bash
git clone https://github.com/Viniciuscarvalho/job-radar.git
cd job-radar
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

To enable optional local AI suggestions, install a compatible [Ollama runtime](https://docs.ollama.com/quickstart) and download the default model on the same computer:

```bash
ollama pull llama3.2
```

If port 3000 is already in use, choose another port:

```bash
PORT=3001 npm start
```

## First run

1. Upload a text-based PDF or DOCX resume (10 MB maximum), or choose **Enter manually**.
2. Review the extracted name, target roles, and skills; change or remove anything that is inaccurate.
3. Confirm at least one target role and one work eligibility/location, then optionally set salary, job type, seniority, work mode, and excluded companies.
4. Select **Find my matches** to scan public sources and rank eligible roles.
5. Open **Why this match** to inspect the evidence, then open the original source to apply and track the stage locally.

Scanned or image-only PDFs are not OCR'd. Use a text-based PDF/DOCX or enter the profile manually instead.

## Career Intelligence

After confirming a profile, use the local Career Intelligence workspace to review a recruiter profile (tech stack, CEFR English level, seniority, goals, and bio), inspect transparent search terms, and export a local recruiter-profile PDF. A public profile URL is not created.

Open an eligible job's details to create an editable, evidence-bound cover-letter draft and explicitly approve it before exporting a local PDF. The same details panel offers a written study plan and question bank. Job Radar never auto-applies or sends profile data to a cloud AI provider.

## How it works

```text
resume or manual entry
        ↓
editable profile draft
        ↓
confirmed roles + work eligibility + preferences
        ↓
public job sources → strict filters → explainable score → application tracking
```

Only jobs passing the confirmed target-role and work-eligibility/location filters are shown. The remaining roles use a transparent score:

| Factor | Weight |
| --- | ---: |
| Skills and keywords | 55% |
| Target-role relevance | 25% |
| Seniority fit | 10% |
| Optional preference fit | 10% |

Results are grouped as **Excellent** (85%+), **Strong** (70–84%), and **Potential**. Search eligible roles by text or filter by tier; when a filter has no matches, clear it to return to the full eligible list. A score is a relevance heuristic, not a promise of employer ATS compatibility or an interview outcome.

## Job sources

- [Remotive](https://remotive.com/)'s public API
- [Remote OK](https://remoteok.com/)'s public API
- Optional [Brave Search](https://brave.com/search/api/) discovery for public Lever, Greenhouse, and Ashby job pages

Job Radar does not scrape authenticated LinkedIn pages or submit applications on anyone's behalf.

When every configured public source is unreachable, the app reports that separately from a successful scan that finds no eligible roles. Existing saved jobs remain available.

## Configuration

Pass optional configuration as environment variables when starting the app. For example:

```bash
BRAVE_SEARCH_API_KEY=your-key PORT=3001 npm start
```

`.env.example` lists the available settings; the application does not load `.env` files automatically.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port; defaults to `3000` |
| `HOST` | No | Bind address; defaults to `0.0.0.0` |
| `BRAVE_SEARCH_API_KEY` | No | Enables public web/ATS discovery through Brave Search |
| `JOB_RADAR_LOCAL_AI_URL` | No | Loopback URL for an Ollama-compatible local runtime; defaults to `http://127.0.0.1:11434` and remote URLs are rejected |
| `JOB_RADAR_LOCAL_AI_MODEL` | No | Local model name used for optional profile and cover-letter suggestions; defaults to `llama3.2` |

The UI creates and maintains the active profile. [`profile.example.json`](profile.example.json) documents the stored profile shape for people who prefer to seed one manually.

## Local API

The browser UI uses a small local JSON API. It has no authentication because it is designed to run on a person's own machine; do not expose it directly to the public internet.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` / `PUT` | `/api/profile` | Read or update a confirmed profile |
| `POST` | `/api/profile/resume` | Parse a resume into an unpersisted editable draft |
| `POST` | `/api/onboarding/complete` | Save a confirmed profile and start a scan |
| `GET` | `/api/jobs` | List eligible jobs ranked by current profile |
| `GET` | `/api/jobs/:id/match` | Explain one job's match score and evidence |
| `POST` | `/api/scan` | Refresh configured public sources |
| `GET` | `/api/ai/status` | Report whether the configured local AI runtime and model are available |
| `GET` | `/api/search-intelligence` | Show resume-derived search terms and the unchanged strict eligibility boundary |
| `GET` / `PUT` | `/api/career-profile` | Read or save a confirmed local recruiter profile |
| `POST` | `/api/career-profile/suggest` | Create an editable local-AI bio suggestion without saving it |
| `POST` | `/api/career-profile/export` | Export the confirmed recruiter profile as a local PDF |
| `POST` | `/api/jobs/:id/cover-letter` | Create an evidence-bound draft only for a selected eligible job |
| `GET` / `PUT` | `/api/cover-letters/:id` | Read or save an edited, unapproved cover-letter draft |
| `POST` | `/api/jobs/:id/cover-letter/export` | Export an explicitly approved draft as a local PDF attachment |
| `POST` | `/api/jobs/:id/interview-plan` | Create written study guidance and practice questions for an eligible job |
| `GET` | `/api/documents/:id` | Download one locally generated PDF |
| `GET` | `/api/stats` | Return application-pipeline counts |
| `GET` / `POST` | `/api/applications` | Read or update the local application pipeline |

## Architecture

Job Radar keeps the core modules deliberately separate:

- `resume-parser.js` extracts local PDF/DOCX text and proposes an editable profile with normalized skill names.
- `profile-store.js` normalizes and validates the confirmed profile before it affects a scan.
- `matcher.js` enforces strict eligibility, calculates the weighted score, and returns evidence and gaps.
- `scanner.js` normalizes public-source results and saves only eligible roles.
- `local-ai.js`, `search-intelligence.js`, `cover-letter.js`, `recruiter-profile.js`, and `interview-planner.js` keep local AI boundaries, transparent search planning, evidence-bound writing, profile validation, and study guidance independently testable.
- `db.js` stores jobs, scans, and application stages in local SQLite.
- `server.js` composes the HTTP API and serves the dependency-light UI in `public/`.

This separation makes the parser and matching rules independently testable and leaves room for additional source adapters without coupling the core to a cloud AI provider.

## Development

```bash
npm test
npm run scan
```

The test suite covers resume parsing and failure handling, profile validation, strict filter and score behavior, confirmed onboarding, job-result feedback, local-AI privacy and failure behavior, CEFR validation, evidence-bound letters, local PDFs, and API-level application-history preservation.

## Privacy

- Resume parsing happens locally; no third-party AI or document processor is used.
- The original resume is discarded after extraction unless the person explicitly opts in to retain a local copy.
- Local candidate and recruiter-profile data, uploaded documents, SQLite data, environment files, and personal root-level `profile.json` files are excluded from Git.
- Do not run the local server on a public network without adding appropriate access controls.

## Contributing

Contributions are welcome—especially improvements that preserve the project's local-first and explainable matching principles.

1. Open or comment on a [GitHub issue](https://github.com/Viniciuscarvalho/job-radar/issues) before a large change.
2. Fork the repository and create a focused branch.
3. Add or update behavior-focused tests with the change.
4. Run `npm test` and explain the result in the pull request.
5. Keep resumes, API keys, application history, and generated local data out of commits.

Useful contribution areas include additional public job-source adapters, richer transparent alias dictionaries, source-health reporting, better salary normalization, and accessibility improvements.

## License

MIT © [Vinicius Carvalho](https://github.com/Viniciuscarvalho)
