# Technical Decisions

This document records the main non-AI technical decisions made while building Meeting Intelli. AI prompt design, citation strategy, hallucination prevention, and output validation are intentionally left for `AI_APPROACH.md`.
The decisions are also taken in considering my familiarity with some of the tech stacks such as using Next.js , using Resend as email integration service etc.

## Database: PostgreSQL with Prisma

**Decision:** Use PostgreSQL as the primary database, accessed through Prisma.

**Why it was chosen:**

PostgreSQL is a strong fit for relational meeting data. Users own meetings, meetings have transcript segments, analyses, action items, and reminder history. These relationships are easier to model and query reliably in a relational database than in a document store.

Prisma was chosen because it gives type-safe database access, clear schema definitions, and migration support. The generated types also help keep API code aligned with the data model.

**Alternatives considered:**

- MongoDB


**Trade-offs:**

PostgreSQL plus Prisma adds setup and migration overhead compared with a lightweight SQLite or in-memory implementation. The benefit is a production-ready relational model with indexes, constraints, and safer query ergonomics.

## Database Schema Design

**Decision:** Model the domain around users, meetings, transcript segments, meeting analysis snapshots, action items, and reminder history.

**Why it was chosen:**

The schema mirrors the assignment workflow:

- `User` owns meetings and stores authentication identity.
- `Meeting` stores meeting metadata such as title, date, participants, and creator.
- `TranscriptSegment` stores timestamped transcript lines for a meeting.
- `MeetingAnalysis` stores the latest generated analysis snapshot for a meeting.
- `ActionItem` stores extracted or manually managed follow-up work.
- `ReminderHistory` records reminder delivery attempts for action items.

This structure keeps ownership clear and makes authorization straightforward. Most user-facing queries can be scoped through `Meeting.createdById`, including action item access and overdue detection.

**Key relationships:**

- `User -> Meeting`: one user can create many meetings.
- `Meeting -> TranscriptSegment`: one meeting has many transcript segments.
- `Meeting -> MeetingAnalysis`: one meeting has at most one current analysis snapshot.
- `Meeting -> ActionItem`: one meeting can have many action items.
- `ActionItem -> ReminderHistory`: one action item can have many reminder attempts.

**Indexes and constraints:**

- `User.email` is unique to prevent duplicate accounts.
- `Meeting.createdById` is indexed for user-scoped meeting queries.
- `Meeting.meetingDate` is indexed for listing and date filtering.
- `TranscriptSegment.meetingId` and `[meetingId, timestamp]` are indexed for transcript lookup and ordering.
- `MeetingAnalysis.meetingId` is unique so each meeting has one active analysis snapshot.
- `ActionItem.meetingId`, `ActionItem.status`, and `ActionItem.dueDate` are indexed for listing, filtering, and overdue detection.
- `ReminderHistory.actionItemId` and `ReminderHistory.sentAt` are indexed for reminder audit lookup.


## Authentication: JWT Bearer Tokens

**Decision:** Use JWT bearer authentication for protected APIs.

**Why it was chosen:**

JWTs work well for a backend API assignment because they are stateless, easy to test with `curl`, and straightforward for evaluators to use in Swagger. The `withAuth` higher-order handler centralizes token verification and injects the authenticated `userId` into route handlers.

**Alternatives considered:**

- Session-based authentication with cookies
- OAuth provider login
- API keys

**Trade-offs:**

JWTs require careful secret management and expiration handling. Session-based auth can be easier to revoke centrally, but it adds more infrastructure and browser-specific behavior. For this API-first service, bearer tokens are simpler and evaluator-friendly.

## Password Storage: bcryptjs

**Decision:** Hash user passwords with `bcryptjs`.

**Why it was chosen:**

Passwords should never be stored in plain text. `bcryptjs` provides a familiar password hashing implementation and works cleanly in the current TypeScript/Bun setup.

**Alternatives considered:**

- Native `bcrypt`
- Delegating auth entirely to a third-party provider

**Trade-offs:**

`bcryptjs` is easy to run in this project and adequate for the assignment scope.

## API Structure: Next.js App Router Route Handlers

**Decision:** Implement APIs as Next.js App Router route handlers under `src/app/api`.

**Why it was chosen:**

The project is already a Next.js 16 application, and route handlers keep API code colocated with the framework's routing conventions. This also works naturally with Vercel deployment and Vercel Cron.
Next.js was chosen as the submission checklist had deployment as a criteria. Deploying next.js on vercel is one of the most straightforward ways and thus was chosen.

**Alternatives considered:**

- Express server
- Fastify server
- Separate backend service

**Trade-offs:**

Next.js route handlers are convenient for deployment and assignment scope, but a dedicated API framework can offer more mature middleware and testing patterns. Keeping everything in Next.js reduces moving parts.

## Authorization Model: User-Scoped Data Access

**Decision:** Protected user routes scope data through `meeting.createdById`.

**Why it was chosen:**

Meetings are owned by the user who created them. Action items belong to meetings, so action item access is also scoped through meeting ownership. This prevents users from reading or mutating other users' meeting data.

**Alternatives considered:**

- Global action item access
- Participant-based access
- Organization/team-level access control

**Trade-offs:**

User ownership is simple and secure for the assignment. It does not yet support collaborative workspaces or participant-level permissions, which would be needed in a larger product.

## Unified API Response Format

**Decision:** Return consistent success and error envelopes across API routes.

**Why it was chosen:**

The assignment requires a unified API response format. A consistent envelope makes API behavior predictable for clients and evaluators. Successful responses return `success`, `traceId`, and `data`; errors return `success`, `traceId`, and `error`.

**Alternatives considered:**

- Returning raw objects per endpoint
- Using framework-default error responses

**Trade-offs:**

The envelope adds a little verbosity to every response. The benefit is consistency, easier debugging, and clearer Swagger documentation.

## Request Traceability

**Decision:** Generate and return a trace ID for API requests.

**Why it was chosen:**

Trace IDs make API responses easier to correlate with logs and debugging output. The middleware injects a trace ID into request headers, and response helpers include it in response bodies.



## Validation: Zod Schemas at API Boundaries

**Decision:** Use Zod for request validation.

**Why it was chosen:**

Zod provides readable schema definitions, strong TypeScript inference, and meaningful validation errors. It is used for auth payloads, meeting payloads, transcript uploads, and status updates.



## External Integration: Resend

**Decision:** Use Resend as the real third-party integration for reminder emails.

**Why it was chosen:**

The assignment requires a real external integration actively used by the reminder workflow. Email is a natural channel for overdue action item reminders, and Resend has a simple API and sender-domain support.

**Alternatives considered:**

- Slack webhook
- Discord webhook
- Telegram Bot API
- SendGrid

**Trade-offs:**

Email delivery depends on verified sender configuration and external provider availability. Slack or Discord could be easier for internal team reminders, but email works for any meeting creator with an email address.

## Reminder Scheduling: Vercel Cron

**Decision:** Use Vercel Cron to trigger the reminder route daily.

**Why it was chosen:**

The app is intended for Vercel deployment, and Vercel Cron integrates directly with route handlers. It avoids running a separate worker process while still fulfilling the scheduled/background job requirement.

**Alternatives considered:**

- Background worker queue

**Trade-offs:**

Vercel Cron invokes routes with `GET`, even though the reminder workflow has side effects. The route is protected by `CRON_SECRET` to avoid public misuse. A larger production system might use a queue and worker for retries and higher throughput.

## Reminder Idempotency

**Decision:** Use `ReminderHistory` to avoid resending successful reminders for the same action item.

**Why it was chosen:**

Cron jobs may run repeatedly, and email delivery should not spam users. The reminder query skips action items that already have a successful reminder history record.

**Alternatives considered:**

- Store `lastRemindedAt` directly on `ActionItem`
- Send reminders every day while overdue
- Use a unique reminder job table

**Trade-offs:**

History records preserve an audit trail of sent and failed attempts. A direct `lastRemindedAt` field would simplify queries, but it loses detail about provider failures and retry history.

## Rate Limiting: Upstash Redis

**Decision:** Rate limit meeting analysis requests with Upstash Redis.

**Why it was chosen:**

AI analysis is the most expensive endpoint and should be protected from repeated abuse. Upstash's HTTP-based Redis works well in serverless environments and supports simple sliding-window rate limits.

**Alternatives considered:**

- In-memory rate limiting
- Database-backed rate limiting
- No rate limiting

**Trade-offs:**

Using Upstash adds environment variables and an external dependency. The benefit is a durable rate limit that works across serverless instances.

## Redis Caching: Upstash Redis

**Decision:** Cache user-scoped list responses for meetings and action items using Upstash Redis.

**Why it was chosen:**

The assignment already uses Upstash Redis for rate limiting, so reusing the same Redis provider keeps the architecture simple. Meeting and action item list endpoints are natural cache candidates because they can be called often, are scoped by user, and are safe to cache briefly.

**Alternatives considered:**

- No caching
- In-memory cache
- Database-only query optimization
- Browser/client-side caching

**Trade-offs:**

Redis caching adds invalidation complexity. To limit stale reads, cache keys are scoped by user and query string, and write routes invalidate the affected user's read caches. The cache is intentionally short-lived, and cache failures are treated as non-fatal so the API can fall back to the database.

## Documentation: Static OpenAPI Spec with Swagger UI

**Decision:** Maintain a static OpenAPI spec in `src/lib/openapi.ts` and serve Swagger UI from `/api/docs`.

**Why it was chosen:**

The assignment requires public API documentation. A static spec is explicit, easy to review, and does not require adding a Swagger generation library. Swagger UI is served through a lightweight HTML route that loads the OpenAPI JSON.

**Alternatives considered:**

- Generate OpenAPI from Zod schemas
- Use decorators/comments to generate docs
- Maintain only README examples

**Trade-offs:**

A static spec can drift from implementation if not maintained. To reduce this risk, unit tests check several important documented routes and schemas.

## Testing: Bun Unit Tests

**Decision:** Use Bun's built-in test runner.

**Why it was chosen:**

The project already uses Bun, so Bun tests avoid adding Jest or Vitest. The test suite focuses on isolated logic: validation schemas, auth helpers, hashing, citation verification, OpenAPI correctness, and action item utility functions.

**Alternatives considered:**

- Jest
- Vitest

**Trade-offs:**

Bun tests are fast and lightweight. Route-handler integration tests would require more mocking or test database setup, so the current suite focuses on reliable unit coverage first.
