import { describe, expect, test } from "bun:test";
import { openApiSpec } from "../openapi";

describe("openApiSpec", () => {
  test("documents the actual meeting PATCH endpoint", () => {
    expect(openApiSpec.paths["/api/meetings/{id}"].patch).toBeDefined();
  });

  test("documents the Vercel cron reminder endpoint as GET", () => {
    expect(openApiSpec.paths["/api/cron/reminders"].get).toBeDefined();
    expect("post" in openApiSpec.paths["/api/cron/reminders"]).toBe(false);
  });

  test("documents action item status updates as status-only", () => {
    const schema = openApiSpec.components.schemas.UpdateActionItemStatusRequest;

    expect(schema.required).toEqual(["status"]);
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties)).toEqual(["status"]);
  });

  test("uses response bodies for success responses", () => {
    const listMeetingsResponse =
      openApiSpec.paths["/api/meetings"].get.responses["200"];

    expect(listMeetingsResponse.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/ApiSuccessMeetingList",
    });
  });
});
