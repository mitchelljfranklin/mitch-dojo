import { listEmailLogs } from "@/lib/db/email-log";

import { EmailLogForm } from "./email-log-form";

// Streams the email log separately so the query never blocks the page shell.
// Lives outside page.tsx so the page can stay a thin permission-gated shell.
export async function EmailLogContent({
  sp,
  canRetry,
}: {
  sp: Record<string, string | undefined>;
  canRetry: boolean;
}) {
  const page = sp.emailLogPage ? parseInt(sp.emailLogPage) : 1;
  const pageSize = sp.emailLogPageSize ? parseInt(sp.emailLogPageSize) : 10;
  const safePage = Number.isNaN(page) ? 1 : page;
  const safePageSize = Number.isNaN(pageSize) ? 10 : pageSize;

  const result = await listEmailLogs(
    {
      status: sp.emailStatus,
      type: sp.emailType,
      recipient: sp.emailRecipient,
      fromDate: sp.emailFrom,
      toDate: sp.emailTo,
    },
    safePage,
    safePageSize,
  );

  return (
    <EmailLogForm
      result={result}
      filters={{
        emailStatus: sp.emailStatus ?? "",
        emailType: sp.emailType ?? "",
        emailRecipient: sp.emailRecipient ?? "",
        emailFrom: sp.emailFrom ?? "",
        emailTo: sp.emailTo ?? "",
      }}
      page={safePage}
      pageSize={safePageSize}
      canRetry={canRetry}
    />
  );
}
