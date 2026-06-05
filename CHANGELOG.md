# Changelog

This changelog documents the main implementation milestones and major changes made while building Meeting Intelli. It is based on the local Git history and the current project state.

## Unreleased

### Added

- Added Docker support through a Bun-based multi-stage `Dockerfile`.
- Added `.dockerignore` to keep local dependencies, build output, Git data, and secrets out of Docker build context.
- Added Upstash Redis caching for `GET /api/meetings`.
- Added Upstash Redis caching for `GET /api/action-items`.
- Added user-scoped cache invalidation for meeting and action item mutations.
- Added assignment-focused documentation:
  - `README.md` for setup, environment variables, local execution, deployment, API examples, assignment summary, and an end-to-end usage flow.
  - `DECISIONS.md` for non-AI technical decisions, database design, alternatives considered, and trade-offs.
  - `AI_APPROACH.md` for prompt design, citation strategy, hallucination prevention, output validation, and known AI limitations.
  - `TESTING.md` for test scenarios, edge cases, manual verification, and testing limitations.

## 2026-06-05

### Added Public Evaluation and Health Endpoints

Related commit: `ee6a507`

- Added `GET /health` as a public health check returning `{ "status": "UP" }`.
- Added `GET /api/evaluation` for evaluator metadata, implemented as an unauthenticated public route.
- Documented the public evaluation and health endpoints in the OpenAPI specification.

### Organized and Expanded Unit Tests

Related commits: `a53f3ef`, `ee6a507`

- Added Bun unit tests for action item helper logic.
- Added tests for overdue detection behavior.
- Added tests for action item status transition helper behavior.
- Added tests for citation verification.
- Added tests for JWT signing, verification, and bearer token extraction.
- Added tests for password hashing and password comparison.
- Added tests for meeting request validation schemas.
- Added tests for transcript hashing stability.
- Added tests to ensure OpenAPI documentation matches key implemented routes.
- Moved tests into a single centralized directory: `src/lib/__tests__/`.

### Improved OpenAPI Documentation

Related commits: `5a3e7c8`, `1e190e6`

- Added Swagger UI at `GET /api/docs`.
- Added raw OpenAPI JSON at `GET /api/docs/openapi.json`.
- Added a static OpenAPI 3.0.3 specification in `src/lib/openapi.ts`.
- Documented authentication, meeting, transcript, analysis, action item, cron, docs, health, and evaluation routes.
- Added structured schemas for users, meetings, transcript segments, action items, meeting analysis, reminder history, paginated responses, success envelopes, and error envelopes.
- Typed success responses instead of leaving them as vague description-only responses.
- Documented the action item status update endpoint as status-only.
- Kept the Vercel cron reminder endpoint documented as `GET` to match Vercel Cron behavior.

### Added Reminder Cron Job and Resend Integration

Related commit: `67367ab`

- Added `GET /api/cron/reminders` for scheduled overdue action item reminders.
- Added `vercel.json` cron configuration for a daily reminder schedule.
- Added `src/lib/resend.ts` for sending reminder emails through Resend.
- Added cron secret authorization using `CRON_SECRET`.
- Added reminder processing for overdue incomplete action items.
- Added reminder history persistence so reminder attempts can be tracked.
- Configured reminder emails to use the verified sender domain `mayankaneja.dev`.

## 2026-06-04

### Added Action Items API

Related commit: `c6d1224`

- Added `GET /api/action-items` to list action items for the authenticated user.
- Added support for status filtering.
- Added support for overdue filtering.
- Added cursor pagination for action item listing.
- Added `GET /api/action-items/overdue` for dedicated overdue action item retrieval.
- Added `PATCH /api/action-items/:id/status` for status-only action item updates.
- Scoped action item retrieval through the authenticated user's meetings.

### Added AI Meeting Analysis

Related commit: `8607290`

- Added `POST /api/meetings/:id/analyze`.
- Integrated Groq for AI-powered meeting analysis.
- Added prompt construction for summary, decisions, follow-ups, and action item extraction.
- Added Zod-based validation for AI output.
- Added citation verification so generated action items must reference real transcript timestamps.
- Added transcript hashing to return cached analysis when transcript content has not changed.
- Added rate limiting for analysis requests using Upstash.
- Added persistence for meeting analysis and generated action items.

### Added Meetings and Transcript APIs

Related commit: `2a8e737`

- Added `POST /api/meetings` to create meetings.
- Added `GET /api/meetings` to list authenticated user's meetings.
- Added `GET /api/meetings/:id` to fetch a single meeting.
- Added `PATCH /api/meetings/:id` to update meeting details.
- Added `DELETE /api/meetings/:id` to delete a meeting.
- Added `POST /api/meetings/:id/transcript` to upload or replace transcript segments.
- Added validation schemas for meeting creation, updates, listing, and transcript uploads.
- Added cursor pagination and optional date filtering for meeting lists.

## 2026-06-03

### Added Authentication and API Infrastructure

Related commit: `d697332`

- Added `POST /api/auth/register`.
- Added `POST /api/auth/login`.
- Added `GET /api/auth/me`.
- Added JWT signing and verification helpers.
- Added password hashing and comparison helpers.
- Added auth middleware and a `withAuth` flow for protected routes.
- Added unified success and error response helpers.
- Added trace IDs to API responses.
- Added shared API, auth, and error types.
- Connected authentication to Prisma-backed user records.

### Added Database Schema and Prisma Setup

Related commit: `f55afcf`

- Added Prisma 7 setup.
- Added PostgreSQL database configuration.
- Added initial Prisma schema and migrations.
- Added core models for users, meetings, transcript segments, meeting analysis, action items, and reminder history.
- Added generated Prisma client setup.

### Bootstrapped Next.js Project

Related commit: `ea2ef89`

- Created the initial Next.js application.
- Added TypeScript, ESLint, app directory structure, and base project configuration.
- Added Bun lockfile and package setup.
- Added project-level agent instructions.
