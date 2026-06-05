# AI Approach

This document explains how Meeting Intelli uses AI for meeting analysis. It covers prompt design, citation strategy, hallucination prevention, output validation, and known limitations.

## Overview

The AI flow is implemented in the meeting analysis endpoint:

```text
POST /api/meetings/:id/analyze
```

The endpoint loads the meeting transcript, checks whether the transcript has changed, calls Groq when fresh analysis is needed, validates the response, verifies action item citations, and then persists the analysis and action items.

The AI provider is Groq, using:

```text
llama-3.3-70b-versatile
```

The model is configured with a low temperature:

```text
temperature = 0.1
```

This keeps outputs more deterministic and less creative, which is important for grounded meeting analysis.

## Prompt Design

The prompt is split into two parts:

- A system prompt that defines the model's role, required JSON structure, and strict rules.
- A user prompt that provides the meeting title and timestamped transcript segments.

### System Prompt Goals

The system prompt instructs the model to behave as a meeting intelligence assistant and return only valid JSON. It explicitly says:

- Do not return markdown.
- Do not return code fences.
- Do not add explanation or preamble.
- Return one JSON object matching the expected shape.

The expected response shape is:

```json
{
  "summary": "string",
  "decisions": ["string"],
  "followUps": ["string"],
  "actionItems": [
    {
      "assignee": "string",
      "task": "string",
      "speakerTimestamp": "HH:MM:SS",
      "dueDate": "YYYY-MM-DD or null"
    }
  ]
}
```

The prompt also defines the meaning of each field:

- `summary`: 2 to 4 sentence factual summary.
- `decisions`: concrete agreements or conclusions reached.
- `followUps`: unresolved topics or deferred questions.
- `actionItems`: assigned tasks with a clear assignee.

### Critical Prompt Rules

The prompt includes strict rules to reduce hallucination:

- `speakerTimestamp` must be copied exactly from the transcript.
- `dueDate` must be `null` unless an explicit deadline was spoken.
- Decisions must be real agreements, not tasks or questions.
- Follow-ups must be unresolved topics.
- Action items must be assigned to a real person.
- Vague or unassigned tasks must be ignored.
- Empty fields must return empty arrays instead of being omitted.
- If no action items exist, the model must return `"actionItems": []`.

### User Prompt Format

The user prompt formats every transcript segment as:

```text
[HH:MM:SS] Speaker: "text"
```

Example:

```text
[00:00:20] Alice: "I will prepare the release notes by Friday."
```

This format makes timestamps visually explicit and gives the model a clear source timestamp to copy into `speakerTimestamp`.

## Citation Strategy

The assignment requires generated insights to be grounded in the transcript. In this implementation, action item grounding is enforced through transcript timestamps.

Each action item returned by the model must include:

```json
{
  "speakerTimestamp": "00:00:20"
}
```

That timestamp is treated as the citation for the transcript segment where the action item was mentioned.

The application builds a `Set` of valid transcript timestamps from the stored transcript segments. After Groq returns output, each action item's `speakerTimestamp` is checked against that set.

If the timestamp exists, the action item is accepted.

If the timestamp does not exist, the action item is dropped and not saved.

This citation verification is implemented in:

```text
src/lib/citation-verifier.ts
```

## Hallucination Prevention Approach

Hallucination prevention happens in multiple layers.

### 1. Prompt Constraints

The prompt directly tells the model not to invent:

- Timestamps
- Deadlines
- Action items
- Assignees
- Decisions
- Follow-up topics

The model is also instructed to return empty arrays instead of inventing content when nothing exists.

### 2. JSON Mode

The Groq call uses JSON response mode:

```ts
response_format: { type: "json_object" }
```

This reduces formatting failures and helps ensure the response can be parsed as JSON.

### 3. Low Temperature

The model runs with:

```text
temperature = 0.1
```

This reduces randomness and makes the model less likely to produce creative or unsupported outputs.

### 4. Schema Validation

The response must pass a Zod schema before it can be used. If the model returns the wrong shape, invalid timestamps, missing fields, or malformed action items, the endpoint rejects the AI response.

### 5. Citation Verification

Even if the model returns valid JSON, action items are not trusted immediately. The application verifies that each action item's `speakerTimestamp` exists in the original transcript.

Any action item with a hallucinated timestamp is dropped before persistence.

### 6. Transcript Hash Gate

The analysis route hashes transcript content. If the transcript has not changed since the last analysis, the endpoint returns cached analysis instead of calling Groq again.

This reduces unnecessary model calls and keeps repeated requests stable.

## Output Validation Strategy

The output validation pipeline is:

1. Call Groq with the system prompt and transcript prompt.
2. Read the model response content.
3. Parse the response as JSON.
4. Validate the parsed JSON with Zod.
5. Build a set of real transcript timestamps.
6. Verify each action item's `speakerTimestamp`.
7. Drop invalid action items.
8. Return only validated, citation-verified action items to the route.
9. Persist analysis and action items in the database.

### Zod Schema Validation

The Zod schema validates:

- `summary` is a non-trivial string.
- `decisions` is an array of strings.
- `followUps` is an array of strings.
- `actionItems` is an array of structured objects.
- `assignee` is not empty.
- `task` is descriptive enough.
- `speakerTimestamp` matches `HH:MM:SS`.
- `dueDate` is either a string or `null`.

If validation fails, the endpoint returns an AI schema error instead of saving bad data.

### Citation Verification

Zod can confirm that a timestamp looks like `HH:MM:SS`, but it cannot confirm that the timestamp actually exists in the transcript. That is why citation verification runs after schema validation.

This second pass checks semantic validity against the actual transcript source.

## Persistence Strategy

The route stores one current `MeetingAnalysis` snapshot per meeting.

When the transcript changes, the analysis is regenerated and the snapshot is updated. Action items are upserted using a stable matching strategy based on:

```text
speakerTimestamp + assignee
```

This is more stable than matching only on task text because the model may rephrase task descriptions between runs.

Existing action item status is preserved when an action item is updated. This prevents AI regeneration from overwriting user progress.

## Error Handling

AI-specific failures are returned as application errors:

- Empty model response: `AI_EMPTY_RESPONSE`
- Groq unavailable or API failure: `AI_UNAVAILABLE`
- Invalid JSON response: `AI_INVALID_JSON`
- Schema mismatch: `AI_SCHEMA_MISMATCH`
- No transcript available: `NO_TRANSCRIPT`

These errors are wrapped in the standard API error envelope with `success: false`, `traceId`, and `error`.

## Known Limitations

### Summary, Decisions, and Follow-Ups Are Prompt-Grounded but Not Independently Citation-Verified

Action items are citation-verified against transcript timestamps. Summary, decisions, and follow-ups are constrained by the prompt and schema, but they are not currently verified sentence-by-sentence against transcript citations.

A stronger version would require each summary point, decision, and follow-up to include citation timestamps and then verify those timestamps the same way action items are verified.

### Due Date Parsing Depends on the Model

The prompt tells the model to return `null` unless a deadline is explicitly mentioned. However, due date extraction still depends on the model interpreting dates correctly.

A stronger version could post-process dates with a deterministic date parser and reject ambiguous deadlines.

### Speaker and Assignee Matching Is Not Fully Normalized

The model returns assignee names as strings. The system does not currently normalize assignees against participants or users.

A stronger version could match assignees against known participants, emails, or user records.

### One Active Analysis Snapshot

The database stores one current analysis snapshot per meeting. It does not preserve a full history of every analysis run.

A stronger version could store immutable analysis versions for auditing and comparison.

### No Human Review Workflow

The system automatically persists validated action items. It does not currently include a review/approval step where a user accepts or rejects model output before saving.

### Model Availability Is External

Analysis depends on Groq availability and API limits. If the provider is unavailable, the endpoint returns an AI availability error.

### Long Transcript Handling Is Basic

The current implementation sends the transcript to the model as one prompt. Very long transcripts may approach token limits.

A stronger version could chunk transcripts, summarize sections, and merge results with citation tracking.
