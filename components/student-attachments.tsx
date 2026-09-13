"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addAttachmentAction,
  deleteAttachmentAction,
} from "@/lib/actions/students";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { formatDate } from "@/lib/utils";

export type StudentAttachmentView = {
  id: string;
  displayName: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date | string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentAttachments({
  studentId,
  attachments,
}: {
  studentId: string;
  attachments: StudentAttachmentView[];
}) {
  const [state, formAction, isPending] = useActionState(
    addAttachmentAction,
    undefined,
  );
  useActionFeedback(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {attachments.length > 0 ? (
          <div className="flex flex-col divide-y rounded-lg border">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <a
                    href={`/api/attachments/${attachment.id}`}
                    className="truncate text-sm hover:underline"
                  >
                    {attachment.displayName}
                  </a>
                  <span className="text-muted-foreground text-xs">
                    {formatSize(attachment.sizeBytes)} ·{" "}
                    {formatDate(attachment.createdAt)}
                  </span>
                </div>
                <form action={deleteAttachmentAction}>
                  <input
                    type="hidden"
                    name="attachmentId"
                    value={attachment.id}
                  />
                  <input type="hidden" name="studentId" value={studentId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    Remove
                  </Button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No attachments yet. Add grading certificates, membership forms, or
            other documents.
          </p>
        )}

        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="grid gap-1">
            <Label htmlFor="attachment-file">Add file</Label>
            <Input
              id="attachment-file"
              name="file"
              type="file"
              required
              className="cursor-pointer"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="attachment-display-name">Display name</Label>
            <Input
              id="attachment-display-name"
              name="displayName"
              placeholder="Optional"
              className="w-48"
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </form>
        {state && !state.ok ? (
          <p className="text-destructive text-sm" role="alert">
            {state.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
