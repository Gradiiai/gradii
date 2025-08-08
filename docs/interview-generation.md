### Unified Interview Generation (Direct + Campaign)

This document proposes and standardizes a simple, unified API to generate interviews from selected question banks for both direct interviews and campaign-based interviews. It supports mix-and-match round types (behavioral, MCQ, coding, and combo) and uses AI only as a fallback when the selected bank does not have enough questions.

### Goals

- Keep it simple and consistent for both direct and campaign flows
- Always fetch questions from the selected question bank when configured
- Support combinations like: Round 1 (MCQ + Behavioral), Round 2 (Coding + Behavioral), etc.
- Avoid duplicating logic across multiple endpoints
- Fall back to AI generation only when the bank lacks required questions

### Current State (observed)

- Direct interview endpoints exist per type: `/api/interviews/behavioral`, `/api/interviews/mcq`, `/api/interviews/coding`, `/api/interviews/combo` and fetch from bank when `useQuestionBank` is true, else call AI.
- Campaign interview scheduling: `/api/campaigns/interviews` reads `interview_setups` (one `questionCollectionId` per round) and tries bank first, then AI fallback.
- Interview setup UI (`app/dashboard/job-campaign/interview-setup/page.tsx`) allows multiple question sets per round (bankId, questionType, numberOfQuestions, difficulty), but `interview_setups` currently stores only one `questionCollectionId`, `numberOfQuestions`, `difficultyLevel`.

Result: UI supports multiple question sets per round, but the backend schema only captures a single bank and count, so mix-and-match loses detail.

### Recommended Data Model

- Extend `interview_setups` with a JSON column to persist per-round question sets:
  - `questionSets jsonb` (array of { bankId, questionType, numberOfQuestions, difficulty })

Example shape of `questionSets`:

```json
[
  { "bankId": "<uuid>", "questionType": "mcq", "numberOfQuestions": 5, "difficulty": "medium" },
  { "bankId": "<uuid>", "questionType": "behavioral", "numberOfQuestions": 3, "difficulty": "easy" }
]
```

Notes:
- If `questionSets` is present, it takes precedence over legacy `questionCollectionId`/`numberOfQuestions`/`difficultyLevel` for question fetching.
- No new tables needed; a single JSON column is the simplest approach and matches the UI’s semantics.

### Unified API

- Endpoint: `POST /api/interviews/generate`

Purpose: Generate questions and create the appropriate interview record for a candidate, using the configured bank(s) from setup or the inline payload. Works for both direct and campaign flows.

Request body (minimal contract):

```json
{
  "flowType": "direct" | "campaign",
  "interviewType": "behavioral" | "mcq" | "coding" | "combo",
  "candidate": {
    "name": "string",
    "email": "string"
  },
  "schedule": {
    "date": "YYYY-MM-DD",
    "time": "HH:mm"
  },
  "campaign": {
    "campaignId": "string",
    "interviewSetupId": "string"
  },
  "questionSource": "bank_with_ai_fallback" | "bank_only" | "ai_only",
  "questionSets": [
    { "bankId": "uuid", "questionType": "mcq", "numberOfQuestions": 5, "difficulty": "medium" },
    { "bankId": "uuid", "questionType": "behavioral", "numberOfQuestions": 3, "difficulty": "easy" }
  ]
}
```

Rules:
- For `flowType = campaign`, the server should read `questionSets` from `interview_setups.questionSets` if present; if not present, fall back to legacy `questionCollectionId` + `numberOfQuestions` + `difficultyLevel`.
- For `flowType = direct`, the client may send `questionSets` directly or a single bank/difficulty via existing fields; server behavior remains the same (bank first, AI fallback as needed).

Response:

```json
{
  "success": true,
  "interviewId": "string",
  "interviewLink": "string",
  "source": "question_bank" | "ai_fallback" | "mixed",
  "questions": [
    { "id": 1, "type": "mcq", "question": "...", "options": ["A", "B"], "correctAnswer": "A" },
    { "id": 2, "type": "behavioral", "question": "...", "expectedAnswer": "..." }
  ]
}
```

### Question Selection Algorithm

1) Determine source:
- If `questionSets` is provided or available in setup: iterate each set and fetch with `getQuestions({ collectionId: bankId, questionType, difficultyLevel })`.
- If only legacy fields are present: fetch by `questionCollectionId` and `interviewType`.

2) Assemble questions:
- For each set: shuffle and select `numberOfQuestions` from the bank results.
- Aggregate all selected questions across sets. If total is short and `questionSource != bank_only`, fill the deficit using the AI generator for the corresponding type(s).
- Mark `source` as `question_bank`, `ai_fallback`, or `mixed` based on what was used.

3) Persist:
- If `interviewType === 'coding'`, insert into `CodingInterview` table; otherwise insert into `Interview` with `interviewType`.
- Always generate a standard interview link: `/interview/verify?email=<email>&interviewId=<id>&type=<interviewType>`.

### Minimal Implementation Plan

1) Schema: add `questionSets jsonb` to `interview_setups` (nullable, default null).
2) UI: ensure `handleSave` sends `rounds[i].questionSets` to setup API. Persist them in `createInterviewSetup`/`update`.
3) Unified generation:
   - Add `POST /api/interviews/generate` that implements the algorithm above and returns the final payload.
   - Internally, call the existing `getQuestions` helper for each set.
4) Refactor compatibility:
   - Make existing direct endpoints call the unified generator internally (pass `flowType = 'direct'`).
   - Make `/api/campaigns/interviews` use the unified generator (pass `flowType = 'campaign'` and rely on setup’s `questionSets`).
   - Keep old endpoints for backward compatibility; mark them as deprecated in code comments.
5) Validation & access:
   - Validate `bankId` UUIDs and access rights (already enforced by existing question bank routes and `getQuestions`).
   - If a bank is missing or empty, automatically fallback to AI when `questionSource` allows it. Otherwise, return a 400 with a clear error.

### Example Payloads

- Campaign Round 1 (MCQ + Behavioral from same bank):

```json
{
  "flowType": "campaign",
  "interviewType": "combo",
  "campaign": { "campaignId": "<cid>", "interviewSetupId": "<setupId>" },
  "candidate": { "name": "Jane Doe", "email": "jane@acme.com" },
  "schedule": { "date": "2025-08-15", "time": "10:30" },
  "questionSource": "bank_with_ai_fallback"
}
```

- Direct Coding Round (single bank):

```json
{
  "flowType": "direct",
  "interviewType": "coding",
  "candidate": { "name": "John Smith", "email": "john@example.com" },
  "schedule": { "date": "2025-08-16", "time": "11:00" },
  "questionSource": "bank_with_ai_fallback",
  "questionSets": [
    { "bankId": "<uuid>", "questionType": "coding", "numberOfQuestions": 3, "difficulty": "medium" }
  ]
}
```

### Error Handling (simple and direct)

- 400: invalid input (missing candidate, invalid `bankId`, unsupported `interviewType`)
- 404: campaign/setup not found (campaign flow)
- 503: AI fallback unavailable and bank insufficient (when `questionSource` allows fallback but both paths fail)

### Backward Compatibility

- Keep `/api/interviews/*` endpoints for now, but route them to the unified generator internally.
- `/api/campaigns/interviews` should read `questionSets` if available; otherwise maintain today’s behavior.

### What This Solves

- Single way to generate interviews for direct and campaign
- Mix-and-match per round is first-class via `questionSets`
- Bank-first logic with clear, automatic fallback keeps behavior predictable
- Minimal schema and code changes; preserves existing tables and helpers

### Checklist to Ship

- [ ] DB migration: add `questionSets jsonb` to `interview_setups`
- [ ] Extend `/api/interviews/setup` to persist `questionSets`
- [ ] Implement `/api/interviews/generate` with the algorithm above
- [ ] Refactor `/api/interviews/*` (direct) and `/api/campaigns/interviews` to call unified generator
- [ ] Update UI to ensure `questionSets` are saved/loaded in setup
- [ ] Add tests for: bank-only, AI-only, bank+AI mixed, direct vs campaign


