export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Meeting Intelli API",
    version: "0.1.0",
    description:
      "Meeting intelligence API for authentication, meeting management, AI analysis, action items, overdue detection, and reminder jobs.",
  },
  servers: [
    {
      url: "https://meeting-intelli.vercel.app",
      description: "Production deployment",
    },
    {
      url: "/",
      description: "Current deployment",
    },
  ],
  tags: [
    { name: "System" },
    { name: "Auth" },
    { name: "Meetings" },
    { name: "Action Items" },
    { name: "Cron" },
    { name: "Evaluation" },
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
        required: ["success", "traceId", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          traceId: { type: "string", example: "abc123" },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Meeting title is required" },
              details: { type: "object", nullable: true, additionalProperties: true },
            },
          },
        },
      },
      User: {
        type: "object",
        required: ["id", "name", "email", "createdAt"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CurrentUser: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            required: ["meetingCount"],
            properties: {
              meetingCount: { type: "integer", minimum: 0 },
            },
          },
        ],
      },
      Meeting: {
        type: "object",
        required: ["id", "title", "meetingDate", "participants", "createdAt", "updatedAt"],
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
      MeetingListItem: {
        allOf: [
          { $ref: "#/components/schemas/Meeting" },
          {
            type: "object",
            required: ["_count"],
            properties: {
              _count: {
                type: "object",
                required: ["transcriptSegments", "actionItems"],
                properties: {
                  transcriptSegments: { type: "integer", minimum: 0 },
                  actionItems: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        ],
      },
      TranscriptSegment: {
        type: "object",
        required: ["speaker", "text", "timestamp"],
        properties: {
          speaker: { type: "string", example: "Alice" },
          text: { type: "string", example: "I will prepare release notes." },
          timestamp: { type: "string", example: "00:00:20" },
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
      MeetingAnalysis: {
        type: "object",
        required: ["summary", "decisions", "followUps", "transcriptHash", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          meetingId: { type: "string" },
          summary: {
            type: "array",
            items: { type: "string" },
          },
          decisions: {
            type: "array",
            items: { type: "string" },
          },
          followUps: {
            type: "array",
            items: { type: "string" },
          },
          transcriptHash: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ActionItem: {
        type: "object",
        required: [
          "id",
          "meetingId",
          "task",
          "assignee",
          "speakerTimestamp",
          "dueDate",
          "status",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          meetingId: { type: "string" },
          task: { type: "string" },
          assignee: { type: "string" },
          speakerTimestamp: { type: "string", example: "00:00:20" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          status: {
            type: "string",
            enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      OverdueActionItem: {
        allOf: [
          { $ref: "#/components/schemas/ActionItem" },
          {
            type: "object",
            required: ["daysOverdue"],
            properties: {
              daysOverdue: { type: "integer", nullable: true },
            },
          },
        ],
      },
      ReminderHistory: {
        type: "object",
        required: ["id", "actionItemId", "sentAt"],
        properties: {
          id: { type: "string" },
          actionItemId: { type: "string" },
          sentAt: { type: "string", format: "date-time" },
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
        minProperties: 1,
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
            minItems: 1,
            maxItems: 5000,
            items: { $ref: "#/components/schemas/TranscriptSegmentInput" },
          },
        },
      },
      UpdateActionItemStatusRequest: {
        type: "object",
        required: ["status"],
        additionalProperties: false,
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
          password: { type: "string", minLength: 8, maxLength: 128, example: "password123" },
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
      ApiSuccessAuth: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["user", "token"],
            properties: {
              user: { $ref: "#/components/schemas/User" },
              token: { type: "string" },
            },
          },
        },
      },
      ApiSuccessCurrentUser: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: { $ref: "#/components/schemas/CurrentUser" },
        },
      },
      ApiSuccessMeeting: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: { $ref: "#/components/schemas/Meeting" },
        },
      },
      ApiSuccessMeetingDetails: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            allOf: [
              { $ref: "#/components/schemas/Meeting" },
              {
                type: "object",
                properties: {
                  transcriptSegments: {
                    type: "array",
                    items: { $ref: "#/components/schemas/TranscriptSegment" },
                  },
                  analysis: {
                    oneOf: [
                      { $ref: "#/components/schemas/MeetingAnalysis" },
                      { type: "null" },
                    ],
                  },
                  actionItems: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ActionItem" },
                  },
                },
              },
            ],
          },
        },
      },
      ApiSuccessMeetingList: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["items", "nextCursor"],
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/MeetingListItem" },
              },
              nextCursor: { type: "string", nullable: true },
            },
          },
        },
      },
      ApiSuccessDeleteMeeting: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["id", "deleted"],
            properties: {
              id: { type: "string" },
              deleted: { type: "boolean", enum: [true] },
            },
          },
        },
      },
      ApiSuccessTranscriptUpload: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["meetingId", "inserted", "message"],
            properties: {
              meetingId: { type: "string" },
              inserted: { type: "integer", minimum: 0 },
              message: { type: "string" },
            },
          },
        },
      },
      AnalyzeMeetingData: {
        type: "object",
        required: ["analysis", "actionItems", "meta"],
        properties: {
          analysis: { $ref: "#/components/schemas/MeetingAnalysis" },
          actionItems: {
            type: "array",
            items: { $ref: "#/components/schemas/ActionItem" },
          },
          meta: {
            type: "object",
            required: [
              "transcriptSegmentsProcessed",
              "actionItemsExtracted",
              "actionItemsDropped",
              "droppedReason",
              "cached",
            ],
            properties: {
              transcriptSegmentsProcessed: { type: "integer", minimum: 0 },
              actionItemsExtracted: { type: "integer", minimum: 0 },
              actionItemsDropped: { type: "integer", minimum: 0 },
              droppedReason: { type: "string", nullable: true },
              cached: { type: "boolean" },
            },
          },
        },
      },
      ApiSuccessAnalyzeMeeting: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: { $ref: "#/components/schemas/AnalyzeMeetingData" },
        },
      },
      ApiSuccessActionItemList: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["items", "nextCursor"],
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/ActionItem" },
              },
              nextCursor: { type: "string", nullable: true },
            },
          },
        },
      },
      ApiSuccessOverdueActionItemList: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["items", "nextCursor", "asOf"],
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/OverdueActionItem" },
              },
              nextCursor: { type: "string", nullable: true },
              asOf: { type: "string", format: "date-time" },
            },
          },
        },
      },
      ApiSuccessActionItem: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: { $ref: "#/components/schemas/ActionItem" },
        },
      },
      ApiSuccessCronReminderResult: {
        type: "object",
        required: ["success", "traceId", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          traceId: { type: "string" },
          data: {
            type: "object",
            required: ["processed", "reminded"],
            properties: {
              processed: { type: "integer", minimum: 0 },
              reminded: { type: "integer", minimum: 0 },
            },
          },
        },
      },
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["UP"] },
        },
      },
      EvaluationResponse: {
        type: "object",
        required: [
          "candidateName",
          "email",
          "repositoryUrl",
          "deployedUrl",
          "externalIntegration",
          "features",
        ],
        properties: {
          candidateName: { type: "string", example: "Mayank Aneja" },
          email: { type: "string", format: "email", example: "mayank@mayankaneja.dev" },
          repositoryUrl: {
            type: "string",
            format: "uri",
            example: "https://github.com/mayankaneja837/meeting_intelli",
          },
          deployedUrl: {
            type: "string",
            format: "uri",
            example: "https://meeting-intelli.vercel.app",
          },
          externalIntegration: { type: "string", example: "Resend" },
          features: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
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
                schema: { $ref: "#/components/schemas/ApiSuccessAuth" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Email already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
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
                schema: { $ref: "#/components/schemas/ApiSuccessAuth" },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessCurrentUser" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/meetings": {
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
          "201": {
            description: "Created meeting",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessMeeting" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
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
          "200": {
            description: "Paginated meeting list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessMeetingList" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
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
          "200": {
            description: "Meeting details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessMeetingDetails" },
              },
            },
          },
          "404": {
            description: "Meeting not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
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
          "200": {
            description: "Updated meeting",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessMeeting" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Meeting not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Meetings"],
        summary: "Delete a meeting",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Deleted meeting",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessDeleteMeeting" },
              },
            },
          },
          "404": {
            description: "Meeting not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
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
          "201": {
            description: "Transcript processed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessTranscriptUpload" },
              },
            },
          },
          "404": {
            description: "Meeting not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/meetings/{id}/analyze": {
      post: {
        tags: ["Meetings"],
        summary: "Run AI analysis for a meeting",
        description:
          "Runs Groq-powered meeting analysis. If the transcript hash matches an existing analysis, a cached result is returned with HTTP 200; otherwise a fresh analysis is generated with HTTP 201.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Cached analysis returned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessAnalyzeMeeting" },
              },
            },
          },
          "201": {
            description: "Fresh analysis generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessAnalyzeMeeting" },
              },
            },
          },
          "404": {
            description: "Meeting not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": {
            description: "No transcript uploaded yet",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded. Per-user limit is 10/hour; per-meeting limit is 3/hour.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/action-items": {
      get: {
        tags: ["Action Items"],
        summary: "List action items",
        description: "Returns action items scoped to the authenticated user's meetings.",
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
          "200": {
            description: "Paginated action item list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessActionItemList" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/action-items/overdue": {
      get: {
        tags: ["Action Items"],
        summary: "List overdue action items",
        description: "Returns overdue action items scoped to the authenticated user's meetings.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated overdue action item list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessOverdueActionItemList" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/action-items/{id}/status": {
      patch: {
        tags: ["Action Items"],
        summary: "Update action item status",
        description:
          "Status-only update. The request body only accepts the status field; task, assignee, dueDate, meetingId, and other action item fields are not updated by this endpoint.",
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
          "200": {
            description: "Updated action item status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessActionItem" },
              },
            },
          },
          "400": {
            description: "Invalid status transition",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Action item not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/cron/reminders": {
      get: {
        tags: ["Cron"],
        summary: "Run the scheduled reminder job",
        description:
          "Secret-protected cron/background job endpoint. It finds overdue action items, sends reminder emails through Resend, and records reminder history.",
        security: [{ cronSecret: [] }],
        responses: {
          "200": {
            description: "Reminder job result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessCronReminderResult" },
              },
            },
          },
          "401": {
            description: "Invalid cron authorization",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/evaluation": {
      get: {
        tags: ["Evaluation"],
        summary: "Assignment evaluation metadata",
        description:
          "Public endpoint used by assignment evaluators to inspect candidate, deployment, integration, and feature metadata.",
        responses: {
          "200": {
            description: "Evaluation metadata",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EvaluationResponse" },
              },
            },
          },
        },
      },
    },
    "/api/docs": {
      get: {
        tags: ["Docs"],
        summary: "Swagger UI HTML",
        responses: {
          "200": {
            description: "Swagger UI HTML page",
            content: {
              "text/html": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/api/docs/openapi.json": {
      get: {
        tags: ["Docs"],
        summary: "OpenAPI JSON specification",
        responses: {
          "200": {
            description: "OpenAPI JSON",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
} as const;
