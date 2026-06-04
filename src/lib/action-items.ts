import { ActionItemStatus } from "@/generated/prisma/client";

export const VALID_ACTION_ITEM_TRANSITIONS: Record<
  ActionItemStatus,
  ActionItemStatus[]
> = {
  [ActionItemStatus.PENDING]: [
    ActionItemStatus.IN_PROGRESS,
    ActionItemStatus.COMPLETED,
  ],
  [ActionItemStatus.IN_PROGRESS]: [
    ActionItemStatus.COMPLETED,
    ActionItemStatus.PENDING,
  ],
  [ActionItemStatus.COMPLETED]: [ActionItemStatus.IN_PROGRESS],
};

export function isValidActionItemStatusTransition(
  currentStatus: ActionItemStatus,
  nextStatus: ActionItemStatus
): boolean {
  return VALID_ACTION_ITEM_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function isOverdue({
  dueDate,
  status,
  asOf = new Date(),
}: {
  dueDate: Date | null;
  status: ActionItemStatus;
  asOf?: Date;
}): boolean {
  return (
    dueDate !== null &&
    dueDate.getTime() < asOf.getTime() &&
    status !== ActionItemStatus.COMPLETED
  );
}
