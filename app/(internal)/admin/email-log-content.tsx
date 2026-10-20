import { listEmailLogs } from "@/lib/db/email-log";

import { EmailLogForm } from "./email-log-form";

// Streams the email log separately so the query never blocks the page shell.
// Lives outside page.tsx so the page can stay a thin permission-gated shell.
export async function EmailLogContent({
  query,
  canRetry,
}: {
  query: Record<string, string | undefined>;
  canRetry: boolean;
}) {
  const page = query.emailLogPage ? parseInt(query.emailLogPage) : 1;
  const pageSize = query.emailLogPageSize
    ? parseInt(query.emailLogPageSize)
    : 10;
  const safePage = Number.isNaN(page) ? 1 : page;
  const safePageSize = Number.isNaN(pageSize) ? 10 : pageSize;

  const result = await listEmailLogs(
    {
      status: query.emailStatus,
      type: query.emailType,
      recipient: query.emailRecipient,
      fromDate: query.emailFrom,
      toDate: query.emailTo,
    },
    safePage,
    safePageSize,
  );

  return (
    <EmailLogForm
      result={result}
      filters={{
        emailStatus: query.emailStatus ?? "",
        emailType: query.emailType ?? "",
        emailRecipient: query.emailRecipient ?? "",
        emailFrom: query.emailFrom ?? "",
        emailTo: query.emailTo ?? "",
      }}
      page={safePage}
      pageSize={safePageSize}
      canRetry={canRetry}
    />
  );
}
