# Job Radar

A simple, fast, local-first and open-source career dashboard. Upload a resume, let Job Radar extract a candidate profile, discover compatible remote jobs, rank them for ATS fit, and track applications from saved to offer.

## Highlights
- **Three-step resume onboarding.** Upload a text-based PDF or DOCX (10 MB max), review the locally extracted profile, then confirm preferences before Job Radar searches for matches.
- Required target roles and work eligibility/location are strict filters. Salary, job type, seniority, work mode and excluded companies are optional preferences.
- Results are transparent **Excellent (85%+)**, **Strong (70–84%)**, or **Potential** matches, with a 55% skills, 25% role, 10% seniority and 10% preference breakdown.
- Candidate-driven discovery: job queries and relevance filters are generated from the current profile instead of being hard-coded to iOS.
- Brazil-based candidates are eligible for **Brazil, LATAM, Latin America, Worldwide and Global Remote** roles.
- Existing submissions stay visible in `Saved → Applied → Interview → Offer / Rejected`.
- Transparent deterministic ATS matching: matched and missing terms are visible; Job Radar never invents experience.
- Responsive local dashboard that works from a phone on the same network.
- Privacy-first: parsing never sends a resume to a third party. The original document is discarded after extraction unless the person explicitly chooses to keep it locally.

## Quick start
Requires Node.js 22+.

```bash
npm install
cp profile.example.json data/profile.json
npm start
```

Open `http://localhost:3000`. The server also prints a LAN URL for your phone.

## First run
1. Upload an ATS-friendly, text-based PDF or DOCX resume (10 MB max), or choose manual entry.
2. Review the extracted name, target roles and skills; edit them as needed.
3. Set required work eligibility/location and optional search preferences.
4. Select **Find my matches**. Job Radar scans and ranks only jobs that meet the required criteria.
5. Open a role to inspect ATS match/gaps, then track the application stage.

Scanned/image-only PDFs are intentionally not OCR'd: local OCR adds significant complexity and can produce misleading ATS data. Use a text-based PDF/DOCX or enter the profile manually.

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

The parser and matcher remain separate: parsing produces an editable draft, profile validation stores only confirmed information, and matching consumes that profile. This keeps the core local and deterministic.

## ATS philosophy
The score is an explainable relevance heuristic, not a claim to reproduce any employer's proprietary ATS or a literal "perfect match." Exact evidence in the confirmed profile is favored. Missing terms are shown as gaps to verify, never as instructions to fabricate experience.

## Privacy
Never commit resumes, cover letters, API keys, local profile data, uploads or application history. They are excluded by `.gitignore`.

## Open source
MIT licensed. Contributions are welcome; keep changes small, privacy-aware, dependency-light and testable.
