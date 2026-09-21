# Local API reference

Base URL: `http://127.0.0.1:3000`

This API is for the bundled local interface. It has no authentication and must not be exposed to the public internet.

## Profile and scanning

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/profile` | Read the confirmed local profile. |
| `PUT` | `/api/profile` | Save a confirmed profile; at least one target role and eligibility/location are required. |
| `POST` | `/api/profile/resume` | Parse a PDF or DOCX into an editable, unpersisted draft. |
| `POST` | `/api/onboarding/complete` | Save the confirmed profile and run a scan. |
| `POST` | `/api/scan` | Refresh Remotive, Remote OK, Himalayas, and Jobicy. |

## Jobs and source review

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/jobs` | List currently eligible jobs with transparent score data. |
| `GET` | `/api/jobs/review` | List discoveries missing source-backed evidence. |
| `GET` | `/api/jobs/:id/match` | Explain a job's score and any saved source analysis. |
| `GET` / `POST` | `/api/jobs/:id/analysis` | Read or create local structured judgments for role, eligibility, requirements, and priority. |
| `POST` | `/api/jobs/:id/interview-plan` | Create written preparation guidance for an eligible job. |

## Career artifacts

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` / `PUT` | `/api/career-profile` | Read or save the local recruiter profile. |
| `POST` | `/api/career-profile/suggest` | Generate an editable local-AI bio suggestion. |
| `POST` | `/api/career-profile/export` | Export the confirmed recruiter profile as a local PDF. |
| `POST` | `/api/jobs/:id/cover-letter` | Create an evidence-bound cover-letter draft for an eligible job. |
| `GET` / `PUT` | `/api/cover-letters/:id` | Read or edit an unapproved draft. |
| `POST` | `/api/cover-letters/:id/claims` | Review draft claims against its stored evidence with local AI. |
| `POST` | `/api/jobs/:id/cover-letter/export` | Export an explicitly approved draft as a local PDF. |
| `GET` | `/api/documents/:id` | Download a generated local PDF. |

## Application tracking and local AI

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/applications` | Read or update the local application pipeline. |
| `GET` | `/api/stats` | Read pipeline counts. |
| `GET` | `/api/ai/status` | Report whether a loopback Ollama-compatible runtime is available. |
| `GET` | `/api/search-intelligence` | Show source terms derived from the confirmed profile. |
