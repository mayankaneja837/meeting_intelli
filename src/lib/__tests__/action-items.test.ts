import { describe, expect, test } from "bun:test";
import { ActionItemStatus } from "@/generated/prisma/client";
import { isOverdue, isValidActionItemStatusTransition } from "../action-items";

describe("isOverdue", () => {
  const asOf = new Date("2026-06-05T09:00:00.000Z");

  test("returns true for incomplete action items with a past due date", () => {
    expect(
      isOverdue({
        dueDate: new Date("2026-06-04T09:00:00.000Z"),
        status: ActionItemStatus.PENDING,
        asOf,
      })
    ).toBe(true);
  });

  test("returns false for completed action items even when the due date is past", () => {
    expect(
      isOverdue({
        dueDate: new Date("2026-06-04T09:00:00.000Z"),
        status: ActionItemStatus.COMPLETED,
        asOf,
      })
    ).toBe(false);
  });

  test("returns false for null or future due dates", () => {
    expect(
      isOverdue({
        dueDate: null,
        status: ActionItemStatus.PENDING,
        asOf,
      })
    ).toBe(false);

    expect(
      isOverdue({
        dueDate: new Date("2026-06-06T09:00:00.000Z"),
        status: ActionItemStatus.PENDING,
        asOf,
      })
    ).toBe(false);
  });
});

describe("isValidActionItemStatusTransition", () => {
  test("allows PENDING to COMPLETED", () => {
    expect(
      isValidActionItemStatusTransition(
        ActionItemStatus.PENDING,
        ActionItemStatus.COMPLETED
      )
    ).toBe(true);
  });

  test("does not allow COMPLETED to PENDING", () => {
    expect(
      isValidActionItemStatusTransition(
        ActionItemStatus.COMPLETED,
        ActionItemStatus.PENDING
      )
    ).toBe(false);
  });
});
