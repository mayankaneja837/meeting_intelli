# Meeting Intelli

Meeting Intelli is a backend-focused meeting intelligence service built for the Hintro Backend/Fullstack Engineering Internship assignment. It lets authenticated users create meetings, upload transcripts, run grounded AI analysis, track action items, detect overdue work, and send scheduled reminder emails through Resend.
It also consists of unit tests to test indiviual features

## Features

- JWT authentication with protected API routes
- Meeting CRUD with cursor pagination
- Transcript upload and update flow
- Groq-powered meeting analysis
- Citation verification for AI-generated action items
- Transcript hash gate to avoid unnecessary re-analysis
- Action item listing, status updates, and overdue detection
- Scheduled reminder cron route with Resend email delivery
- Reminder history persistence
- Upstash Redis caching for meeting and action item list endpoints
- Unified success/error API response envelopes with trace IDs
- Upstash rate limiting for analysis requests
- Swagger/OpenAPI documentation
- Public health and evaluation endpoints
- CORS headers enabled for API routes and health checks
- Bun unit tests
- Docker support

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Bun
- Prisma 7
- Neon/PostgreSQL
- Groq SDK
- Resend
- Upstash Redis/Ratelimit
- Zod

## Setup Instructions

Install dependencies:

```bash
bun install
```

Create a local environment file:

```bash
cp .env.example .env
```

If `.env.example` is not present, create `.env` manually using the environment variable list below.

Generate the Prisma client:

```bash
bunx prisma generate
```

Apply database migrations:

```bash
bunx prisma migrate deploy
```

For local development with a new database, you can use:

```bash
bunx prisma migrate dev
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."

JWT_SECRET="replace-with-a-long-random-secret"

GROQ_API_KEY="gsk_..."

UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

RESEND_API_KEY="re_..."
RESEND_FROM="Meeting Intelli <reminders@mayankaneja.dev>"

CRON_SECRET="replace-with-a-long-random-secret"

DEPLOYED_URL="https://meeting-intelli.vercel.app"
```

Notes:

- `DATABASE_URL` is used by Prisma through the PostgreSQL adapter.
- `JWT_SECRET` signs and verifies auth tokens.
- `GROQ_API_KEY` is required for meeting analysis.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` power rate limiting and Redis caching.
- `RESEND_API_KEY` and `RESEND_FROM` are required for reminder emails.
- `CRON_SECRET` protects the reminder cron endpoint.
- `DEPLOYED_URL` is returned by `/api/evaluation`.

## Local Execution Steps

Start the development server:

```bash
bun run dev
```

Open:

```text
http://localhost:3000
```

Run linting:

```bash
bun run lint
```

Run TypeScript checks:

```bash
bunx tsc --noEmit
```

Run unit tests:

```bash
bun test
```

Build for production:

```bash
bun run build
```

Start the production server locally:

```bash
bun run start
```

## Docker

Build the Docker image:

```bash
docker build -t meeting-intelli .
```

Run the container with your local environment file:

```bash
docker run --env-file .env -p 3000:3000 meeting-intelli
```

The container uses Bun, generates the Prisma client during the build, builds the Next.js app, and starts the production server on port `3000`.

## API Documentation

Swagger UI is available at:

```text
/api/docs
```

Raw OpenAPI JSON is available at:

```text
/api/docs/openapi.json
```

The Swagger UI page loads Swagger assets from `unpkg`, so the browser needs internet access to render the UI. The OpenAPI JSON endpoint works without external assets.

## Public Assignment Endpoints

Health check:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "UP"
}
```

Evaluation metadata:

```bash
curl http://localhost:3000/api/evaluation
```

## API Usage Examples

Set a base URL:

```bash
BASE_URL="http://localhost:3000"
```

### Register

```bash
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mayank Aneja",
    "email": "mayank@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mayank@example.com",
    "password": "password123"
  }'
```

Save the returned JWT:

```bash
TOKEN="paste-token-here"
```

### Get Current User

```bash
curl "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Meeting

Dummy meeting request body format:

```json
{
  "title": "Sprint Planning",
  "participants": ["alice@example.com", "bob@example.com"],
  "meetingDate": "2099-06-05T10:00:00Z"
}
```

```bash
curl -X POST "$BASE_URL/api/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sprint Planning",
    "participants": ["alice@example.com", "bob@example.com"],
    "meetingDate": "2099-06-05T10:00:00Z"
  }'
```

### Upload Transcript

Transcript upload request body format:

```json
{
  "segments": [
    {
      "speaker": "Alice",
      "text": "Meeting transcript text goes here.",
      "timestamp": "00:00:10"
    },
    {
      "speaker": "Bob",
      "text": "Another transcript segment goes here.",
      "timestamp": "00:00:55"
    }
  ]
}
```

Each segment should include `speaker`, `text`, and `timestamp`; timestamps are later used as grounding citations for AI analysis.

```bash
MEETING_ID="paste-meeting-id-here"

curl -X POST "$BASE_URL/api/meetings/$MEETING_ID/transcript" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {
        "speaker": "Alice",
        "text": "Meeting transcript text goes here.",
        "timestamp": "00:00:10"
      },
      {
        "speaker": "Bob",
        "text": "Another transcript segment goes here.",
        "timestamp": "00:00:55"
      }
    ]
  }'
```

### Analyze Meeting

```bash
curl -X POST "$BASE_URL/api/meetings/$MEETING_ID/analyze" \
  -H "Authorization: Bearer $TOKEN"
```

The analysis endpoint returns cached analysis with HTTP `200` if the transcript hash has not changed, or fresh analysis with HTTP `201`.

### List Action Items

```bash
curl "$BASE_URL/api/action-items?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Filter by status:

```bash
curl "$BASE_URL/api/action-items?status=PENDING" \
  -H "Authorization: Bearer $TOKEN"
```

Filter by assignee or meeting:

```bash
curl "$BASE_URL/api/action-items?assignee=Bob%20Smith&meetingId=$MEETING_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Filter to overdue items:

```bash
curl "$BASE_URL/api/action-items?overdue=true" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Action Item

```bash
curl -X POST "$BASE_URL/api/action-items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "paste-meeting-id-here",
    "task": "Prepare release notes",
    "assignee": "Alice",
    "speakerTimestamp": "00:00:20",
    "dueDate": "2099-06-10T00:00:00Z"
  }'
```

`speakerTimestamp` must match a timestamp from an uploaded transcript segment for that meeting.

### Update Action Item Status

```bash
ACTION_ITEM_ID="paste-action-item-id-here"

curl -X PATCH "$BASE_URL/api/action-items/$ACTION_ITEM_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

This endpoint only accepts the `status` field.

### List Overdue Action Items

```bash
curl "$BASE_URL/api/action-items/overdue" \
  -H "Authorization: Bearer $TOKEN"
```

### Trigger Reminder Cron Locally

```bash
curl "$BASE_URL/api/cron/reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Vercel Cron calls this same route on the configured schedule.

## Reminder Cron

The reminder job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "30 3 * * *"
    }
  ]
}
```

Vercel schedules are UTC. `30 3 * * *` runs daily at 9:00 AM IST.

The cron route:

- Requires `Authorization: Bearer <CRON_SECRET>`
- Finds overdue action items where `dueDate < now` and status is not `COMPLETED`
- Skips action items that already have a successful reminder history record
- Sends reminder emails to the meeting creator/owner via Resend
- Records `SENT` or `FAILED` reminder history

Important participant-modeling distinction: meeting `participants` and action item `assignee` values are stored as plain strings, not normalized user accounts. Because assignees are not guaranteed to have verified emails in the system, overdue reminder emails go to the user who created the meeting, not directly to the assignee.

## Redis Caching

Upstash Redis is used for two backend concerns:

- Rate limiting on `POST /api/meetings/{id}/analyze`
- Short-lived caching for `GET /api/meetings` and `GET /api/action-items`

The list caches are user-scoped and query-scoped. Meeting list cache entries are invalidated when meetings are created, updated, deleted, or transcript segments are uploaded. Action item cache entries are invalidated when analysis creates or updates action items, when manual action items are created, when meetings are deleted, or when an action item status is changed.

## Deployment Instructions

1. Push the repository to GitHub:

```text
https://github.com/mayankaneja837/meeting_intelli
```

2. Create a Vercel project from the GitHub repository.

3. Add all required environment variables in Vercel Project Settings.

4. Ensure the Neon/PostgreSQL database is reachable from Vercel.

5. Run Prisma migrations against the production database:

```bash
bunx prisma migrate deploy
```

6. Deploy on Vercel.

7. Set `DEPLOYED_URL` to the final production URL.

8. Verify these public endpoints:

```text
https://meeting-intelli.vercel.app/health
https://meeting-intelli.vercel.app/api/evaluation
https://meeting-intelli.vercel.app/api/docs
https://meeting-intelli.vercel.app/api/docs/openapi.json
```

## Testing

Run all tests:

```bash
bun test
```

The current tests cover:

- JWT helpers
- Password hashing and verification
- Meeting validation schemas
- Transcript hashing
- Citation verification
- Action item overdue and transition helper logic
- OpenAPI route/schema correctness

These tests are unit tests and do not call the database, Groq, Resend, or Vercel Cron.

## Repository

```text
https://github.com/mayankaneja837/meeting_intelli
```

## Assignment Summary

This project implements the Meeting Intelligence Service described in the assignment. Users can register, log in with JWT authentication, create meetings, upload transcript segments, and run AI-powered meeting analysis through Groq. The analysis flow is designed to stay grounded in transcript content: generated summary points, decisions, and follow-ups include transcript timestamp citations that are checked against real transcript timestamps, action items are checked against real transcript timestamps through `speakerTimestamp`, and transcript hashing prevents unnecessary repeated analysis when meeting content has not changed.

The application stores meetings, transcript segments, analyses, action items, and reminder history in PostgreSQL through Prisma. Action items can be listed, filtered, marked by status, and queried when overdue. A Vercel Cron-compatible reminder endpoint runs daily, finds overdue incomplete action items, sends reminder emails to the meeting creator through Resend, and records the reminder outcome.

The API follows a consistent response shape with `success`, `traceId`, and either `data` or `error`. Public evaluator-facing endpoints are available at `/health`, `/api/evaluation`, `/api/docs`, and `/api/docs/openapi.json`. The project also includes Bun unit tests for auth helpers, validation schemas, transcript hashing, citation verification, OpenAPI correctness, password helpers, and action item utility logic.

## End-to-End Flow

A typical evaluator flow starts with user registration. The evaluator calls `POST /api/auth/register` with a name, email, and password. The API hashes the password, creates a user in PostgreSQL, signs a JWT, and returns the user plus token in the standard success response envelope.

The token is then used as `Authorization: Bearer <token>` for protected routes. The evaluator can call `GET /api/auth/me` to confirm authentication and fetch the current user profile.

Next, the evaluator creates a meeting with `POST /api/meetings`. The meeting stores a title, meeting date, participants, and the authenticated user's ID as `createdById`. Participants are intentionally stored as strings rather than normalized user records. The evaluator can then call `GET /api/meetings` or `GET /api/meetings/{id}` to confirm the meeting exists.

After creating the meeting, the evaluator uploads transcript segments with `POST /api/meetings/{id}/transcript`. Each segment contains a `timestamp`, `speaker`, and `text`. These transcript timestamps become the grounding source for AI-generated insights.

The evaluator then calls `POST /api/meetings/{id}/analyze`. The service fetches the meeting transcript, checks the transcript hash, and either returns cached analysis or calls Groq for a fresh analysis. The AI output is validated, and citations for summary points, decisions, and follow-ups are verified against real transcript timestamps before being stored. Action items continue to be verified through `speakerTimestamp`. This prevents unsupported generated items from being saved.

Once analysis is complete, the evaluator can call `GET /api/action-items` to list generated action items, filter by status with `?status=PENDING`, filter by assignee with `?assignee=Bob%20Smith`, filter by meeting with `?meetingId=...`, or filter overdue items with `?overdue=true`. Manual action items can also be created with `POST /api/action-items`. The dedicated `GET /api/action-items/overdue` endpoint returns overdue items with `daysOverdue`.

The evaluator can update only an action item's status through `PATCH /api/action-items/{id}/status`. This endpoint accepts only a `status` value and enforces the status transition rules.

Finally, the scheduled reminder workflow is triggered by Vercel Cron through `GET /api/cron/reminders`. The route is protected with `CRON_SECRET`, finds overdue incomplete action items that have not already received a successful reminder, sends an email to the meeting creator through Resend, and writes a `ReminderHistory` record. It does not email assignees directly because assignees are extracted/stored as strings and are not normalized to verified user accounts. Locally, the same flow can be tested by calling the cron endpoint manually with the cron bearer token.

Public evaluator routes remain accessible without authentication throughout the flow: `/health` verifies the service is up, `/api/evaluation` returns assignment metadata, and `/api/docs` exposes Swagger documentation for all API routes.
