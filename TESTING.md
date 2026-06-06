# Testing

This document summarizes the testing work completed for Meeting Intelli. The project uses Bun's built-in test runner through the `bun test` command.

## How to Run Tests

Install dependencies first:

```bash
bun install
```

Run the full test suite:

```bash
bun test
```

Run linting:

```bash
bun run lint
```

Run TypeScript checks:

```bash
bunx tsc --noEmit
```

## Test Scenarios Executed

### Authentication Helpers

File: `src/lib/__tests__/jwt.test.ts`

These tests verify the JWT helper behavior used by authenticated routes.

- Signing a JWT with a user ID and email.
- Verifying a valid JWT and reading the expected payload fields.
- Rejecting invalid JWT strings with an unauthorized error.
- Extracting a token from a valid `Authorization: Bearer <token>` header.
- Rejecting missing, malformed, or empty bearer tokens.

### Password Hashing

File: `src/lib/__tests__/password.test.ts`

These tests verify password security helper behavior.

- Passwords are hashed instead of stored as plain text.
- The original password verifies successfully against the generated hash.
- An incorrect password fails verification.

### Meeting Validation

File: `src/lib/__tests__/meetings.test.ts`

These tests verify the Zod schemas that protect meeting-related input.

- A minimal meeting creation payload is accepted.
- `participants` defaults to an empty array when not provided.
- Invalid date strings are rejected.
- Empty update payloads are rejected so PATCH requests must change something.
- Large list limits are clamped to the supported maximum.
- Empty transcript uploads are rejected.

### Transcript Hashing

File: `src/lib/__tests__/transcript-hash.test.ts`

These tests verify the transcript hash gate used by the AI analysis flow.

- The same transcript produces the same hash even if segments arrive in a different order.
- The hash format is a 64-character SHA-256 hex string.
- Changing transcript content changes the hash.

### Citation Verification

File: `src/lib/__tests__/citation-verifier.test.ts`

These tests verify the grounding step for AI-generated insights and action items.

- Summary points, decisions, and follow-ups with citation timestamps that exist in the transcript are kept.
- Action items with a `speakerTimestamp` that exists in the transcript are kept.
- Action items with hallucinated or missing transcript timestamps are dropped.
- Decisions and follow-ups with hallucinated citation timestamps are dropped.
- Dropped generated items include a reason explaining why they were rejected.

### Action Item Logic

File: `src/lib/__tests__/action-items.test.ts`

These tests verify pure action item utility logic.

- Incomplete action items with a past due date are treated as overdue.
- Completed action items are not treated as overdue, even if the due date is in the past.
- Action items with `null` due dates are not overdue.
- Future due dates are not overdue.
- The status transition helper allows `PENDING` to `COMPLETED`.
- The status transition helper rejects `COMPLETED` to `PENDING`.

### OpenAPI Documentation

File: `src/lib/__tests__/openapi.test.ts`

These tests verify that the OpenAPI specification reflects the real API surface.

- The meeting PATCH endpoint is documented.
- The Vercel cron reminder endpoint is documented as `GET`.
- The action item status update schema is status-only.
- Manual action item creation is documented.
- Action item list filters for `assignee` and `meetingId` are documented.
- Success responses include JSON response body schemas instead of vague descriptions.

## Edge Cases Considered

- Missing authorization headers are rejected.
- Non-bearer authorization headers are rejected.
- Empty bearer tokens are rejected.
- Invalid JWT values are rejected.
- Incorrect passwords do not authenticate.
- Invalid meeting dates are rejected before database work.
- Empty meeting update bodies are rejected.
- Excessive pagination limits are clamped.
- Empty transcript uploads are rejected.
- Transcript hashing is stable across input ordering.
- Transcript hashing changes when transcript text changes.
- AI action items with unsupported citation timestamps are removed.
- Completed action items are excluded from overdue detection.
- `null` due dates are excluded from overdue detection.
- Future due dates are excluded from overdue detection.
- OpenAPI docs are checked for important assignment-specific routes and schemas.

## Limitations Discovered

- The current automated suite is mostly unit-level. It does not spin up a test database or run full HTTP integration tests against Next.js route handlers.
- Prisma queries, Neon/PostgreSQL connectivity, and database migrations are not validated by the unit tests.
- Groq AI calls are not executed in tests because they depend on an external service and could produce non-deterministic responses.
- Resend email delivery is not executed in tests because sending real emails during automated tests would create side effects.
- Vercel Cron behavior is not executed by the test suite. The cron endpoint can be tested locally with a direct HTTP request, but the actual schedule is verified after deployment.
- Upstash rate limiting behavior is not covered by automated tests because it depends on external Redis state.
- The tests verify the OpenAPI spec structure, but they do not perform schema contract testing against every live route response.
- The status transition helper is tested independently. Route-level transition behavior should be covered by future integration tests to ensure the helper and API stay aligned.
- Participants and assignees are not normalized user records, so tests do not cover direct reminder delivery to assignees. Reminder delivery is intentionally owner-focused: overdue reminder emails go to the meeting creator.

## Manual Verification Performed

Alongside unit tests, the following flows were manually exercised during development:

- Starting the project locally with Bun.
- Registering and logging in to receive a JWT.
- Creating a meeting.
- Listing meetings for the authenticated user.
- Uploading transcript segments.
- Running AI analysis.
- Listing action items.
- Filtering overdue action items.
- Triggering the reminder cron endpoint locally with the cron secret.
- Confirming a reminder email was received through Resend.
- Opening Swagger UI at `/api/docs`.
- Fetching OpenAPI JSON from `/api/docs/openapi.json`.
- Fetching the public health endpoint at `/health`.
- Fetching the public evaluation endpoint at `/api/evaluation`.

## Current Test Result

Latest local result:

```text
29 pass
0 fail
```
