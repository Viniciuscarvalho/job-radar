# Job Radar

A simple, fast, local-first and open-source career dashboard. Upload a resume, let Job Radar extract a candidate profile, discover compatible remote jobs, rank them for ATS fit, and track applications from saved to offer.

## V2 highlights
- **Resume → profile → jobs in one action.** Upload a text-based PDF/TXT/Markdown resume and the app extracts target-role signals and a broad technical skill set, saves the local candidate profile, recalculates ATS scores and runs a fresh scan.
- Candidate-driven discovery: job queries and relevance filters are generated from the current profile instead of being hard-coded to iOS.
- Brazil-based candidates are eligible for **Brazil, LATAM, Latin America, Worldwide and Global Remote** roles.
- Existing submissions stay visible in `Saved → Applied → Interview → Offer / Rejected`.
- Transparent deterministic ATS matching: matched and missing terms are visible; Job Radar never invents experience.
- Responsive local dashboard that works from a phone on the same network.
- Privacy-first: resumes, profile, application history and SQLite data are gitignored and stay local.

## Quick start
Requires Node.js 22+.

```bash
npm install
cp profile.example.json data/profile.json
npm start
```

Open `http://localhost:3000`. The server also prints a LAN URL for your phone.

## First run
1. Open **Resume-powered search profile**.
2. Upload an ATS-friendly, text-based PDF resume (10 MB max).
3. Review the extracted location, roles and skills; edit them if necessary.
4. Job Radar automatically scans available sources and ranks results.
5. Open a role to inspect ATS match/gaps, then track the application stage.

Scanned/image-only PDFs are intentionally not OCR'd in V2: local OCR adds significant complexity and can produce misleading ATS data. Export a text-based PDF instead.

## Sources
- Remotive public API
- RemoteOK public API
- Optional Brave Search discovery for public LinkedIn job pages/posts plus Lever, Greenhouse and Ashby pages

Set `BRAVE_SEARCH_API_KEY` in your environment to enable discovery. Job Radar does **not** scrape authenticated LinkedIn pages.

## Architecture
- `server.js` — HTTP/API composition root
- `resume-parser.js` — local resume text extraction and deterministic profile inference
- `profile-store.js` — candidate profile persistence
- `scanner.js` — source adapters, candidate-driven discovery, normalization and eligibility
- `matcher.js` — transparent ATS scoring
- `db.js` — SQLite persistence/migrations
- `public/` — dependency-light responsive UI

The parser and matcher remain separate: resume parsing produces a candidate profile; job matching consumes that profile. This keeps future parsers/LLM providers optional rather than coupling core matching to AI.

## ATS philosophy
The score is an explainable relevance heuristic, not a claim to reproduce any employer's proprietary ATS. Exact evidence in the resume is favored. Missing terms are shown as gaps to verify, never as instructions to fabricate experience.

## Daily scan on macOS
```bash
./scripts/install-macos-launchagent.sh
```

## Privacy
Never commit resumes, cover letters, API keys, local profile data, uploads or application history. They are excluded by `.gitignore`.

## Open source
MIT licensed. Contributions are welcome; keep changes small, privacy-aware, dependency-light and testable.
