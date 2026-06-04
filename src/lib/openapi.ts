export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Meeting Intelli API",
    version: "0.1.0",
    description:
      "Meeting intelligence API for authentication, meeting management, AI analysis, action items, overdue detection, and reminder cron jobs.",
  },
  servers: [
    {
      url: "/",
      description: "Current deployment",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "Meetings" },
    { name: "Action Items" },
    { name: "Cron" },
    { name: "Docs" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cronSecret: {
        type: "http",
        scheme: "bearer",
        description: "Use CRON_SECRET as the bearer token.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "traceId"],
        properties: {
          success: { type: "boolean", example: false },
          traceId: { type: "string", example: "abc123" },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Meeting title is required" },
              details: {},
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Meeting: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          meetingDate: { type: "string", format: "date-time" },
          participants: {
            type: "array",
            items: { type: "string" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TranscriptSegmentInput: {
        type: "object",
        required: ["speaker", "text", "timestamp"],
        properties: {
          speaker: { type: "string", example: "Alice" },
          text: { type: "string", example: "I will prepare release notes." },
          timestamp: { type: "string", example: "00:00:20" },
        },
      },
      CreateMeetingRequest: {
        type: "object",
        required: ["title", "meetingDate"],
        properties: {
          title: { type: "string", example: "Sprint Planning" },
          meetingDate: {
            type: "string",
            format: "date-time",
            example: "2026-06-05T10:00:00Z",
          },
          participants: {
            type: "array",
            items: { type: "string" },
            example: ["alice@example.com", "bob@example.com"],
          },
        },
      },
      UpdateMeetingRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          meetingDate: { type: "string", format: "date-time" },
          participants: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      UploadTranscriptRequest: {
        type: "object",
        required: ["segments"],
        properties: {
          segments: {
            type: "array",
            items: { $ref: "#/components/schemas/TranscriptSegmentInput" },
          },
        },
      },
      ActionItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          meetingId: { type: "string" },
          task: { type: "string" },
          assignee: { type: "string" },
          speakerTimestamp: { type: "string" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          status: {
            type: "string",
            enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UpdateActionItemStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Mayank Aneja" },
          email: { type: "string", format: "email", example: "mayank@example.com" },
          password: { type: "string", minLength: 8, example: "password123" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "mayank@example.com" },
          password: { type: "string", example: "password123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          traceId: { type: "string" },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              token: { type: "string" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Registered user and JWT token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": { description: "Validation error" },
          "409": { description: "Email already exists" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated user and JWT token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current user profile" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/meetings": {
      get: {
        tags: ["Meetings"],
        summary: "List meetings",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": { description: "Paginated meeting list" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Meetings"],
        summary: "Create a meeting",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateMeetingRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Created meeting" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/meetings/{id}": {
      get: {
        tags: ["Meetings"],
        summary: "Get a meeting",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Meeting details" },
          "404": { description: "Meeting not found" },
        },
      },
      patch: {
        tags: ["Meetings"],
        summary: "Update a meeting",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMeetingRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Updated meeting" },
          "404": { description: "Meeting not found" },
        },
      },
      delete: {
        tags: ["Meetings"],
        summary: "Delete a meeting",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted meeting" },
          "404": { description: "Meeting not found" },
        },
      },
    },
    "/api/meetings/{id}/transcript": {
      post: {
        tags: ["Meetings"],
        summary: "Upload or update transcript segments",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadTranscriptRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Transcript processed" },
          "404": { description: "Meeting not found" },
        },
      },
    },
    "/api/meetings/{id}/analyze": {
      post: {
        tags: ["Meetings"],
        summary: "Run AI analysis for a meeting",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Cached analysis returned" },
          "201": { description: "Analysis generated" },
          "404": { description: "Meeting not found" },
          "422": { description: "Meeting has no transcript" },
        },
      },
    },
    "/api/action-items": {
      get: {
        tags: ["Action Items"],
        summary: "List action items",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
          },
          { name: "overdue", in: "query", schema: { type: "boolean" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Paginated action item list" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/action-items/overdue": {
      get: {
        tags: ["Action Items"],
        summary: "List overdue action items for the authenticated user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Paginated overdue action item list" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/action-items/{id}/status": {
      patch: {
        tags: ["Action Items"],
        summary: "Update action item status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateActionItemStatusRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Updated action item" },
          "400": { description: "Invalid status transition" },
          "404": { description: "Action item not found" },
        },
      },
    },
    "/api/cron/reminders": {
      get: {
        tags: ["Cron"],
        summary: "Send overdue action item reminder emails",
        security: [{ cronSecret: [] }],
        responses: {
          "200": { description: "Reminder job result" },
          "401": { description: "Invalid cron authorization" },
        },
      },
    },
    "/api/docs/openapi.json": {
      get: {
        tags: ["Docs"],
        summary: "OpenAPI JSON specification",
        responses: {
          "200": { description: "OpenAPI JSON" },
        },
      },
    },
  },
} as const;
