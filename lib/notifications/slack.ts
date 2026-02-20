interface SlackPayload {
  text: string;
  blocks?: object[];
}

export async function sendSlackNotification(
  webhookUrl: string,
  payload: SlackPayload
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Slack notification failed:", res.status, await res.text());
  }
}

export function buildAdrSlackMessage(opts: {
  projectName: string;
  adrNumber: number;
  title: string;
  status: string;
  author: string;
  appUrl: string;
  projectSlug: string;
  adrId: string;
}): SlackPayload {
  const num = String(opts.adrNumber).padStart(4, "0");
  const url = `${opts.appUrl}/projects/${opts.projectSlug}/adrs/${opts.adrId}`;

  return {
    text: `New ADR in *${opts.projectName}*: ADR-${num} — ${opts.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New ADR posted in ${opts.projectName}*\n*<${url}|ADR-${num}: ${opts.title}>*\nStatus: \`${opts.status}\` · Author: ${opts.author}`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "View ADR" },
          url,
        },
      },
    ],
  };
}
