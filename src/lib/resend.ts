import { Resend } from "resend";
import type { ActionItemStatus } from "@/generated/prisma/client";
import { InternalError } from "@/types/errors";

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new InternalError("RESEND_API_KEY must be set");
  }

  if (!resend) {
    resend = new Resend(apiKey);
  }

  return resend;
}

export async function sendReminderEmail({
  to,
  task,
  assignee,
  status,
  meetingTitle,
  dueDate,
}: {
  to: string;
  task: string;
  assignee: string;
  status: ActionItemStatus;
  meetingTitle: string;
  dueDate: Date | null;
}) {
  const dueDateLabel = dueDate ? dueDate.toISOString() : "Not provided";

  return getResend().emails.send({
    from: process.env.RESEND_FROM!,
    to,
    subject: `Overdue Action Item - ${meetingTitle}`,
    text: [
      "An action item from one of your meetings is overdue.",
      "",
      `Meeting: ${meetingTitle}`,
      `Task: ${task}`,
      `Assigned To: ${assignee}`,
      `Status: ${status}`,
      `Due Date: ${dueDateLabel}`,
    ].join("\n"),
    html: `
      <h2>Action Item Overdue</h2>
      <p>An action item from one of your meetings is overdue.</p>
      <ul>
        <li><strong>Meeting:</strong> ${meetingTitle}</li>
        <li><strong>Task:</strong> ${task}</li>
        <li><strong>Assigned To:</strong> ${assignee}</li>
        <li><strong>Status:</strong> ${status}</li>
        <li><strong>Due Date:</strong> ${dueDateLabel}</li>
      </ul>
    `,
  });
}
