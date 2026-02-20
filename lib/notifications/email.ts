export async function sendAdrEmail(opts: {
  to: string;
  projectName: string;
  adrNumber: number;
  title: string;
  status: string;
  author: string;
  appUrl: string;
  projectSlug: string;
  adrId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const num = String(opts.adrNumber).padStart(4, "0");
  const url = `${opts.appUrl}/projects/${opts.projectSlug}/adrs/${opts.adrId}`;

  await resend.emails.send({
    from: process.env.NOTIFICATION_FROM_EMAIL ?? "noreply@example.com",
    to: opts.to,
    subject: `[${opts.projectName}] New ADR: ADR-${num} — ${opts.title}`,
    html: `
      <h2>New ADR in ${opts.projectName}</h2>
      <p><strong><a href="${url}">ADR-${num}: ${opts.title}</a></strong></p>
      <p>Status: <code>${opts.status}</code> &nbsp;·&nbsp; Author: ${opts.author}</p>
      <p><a href="${url}">View the full ADR →</a></p>
    `,
  });
}
