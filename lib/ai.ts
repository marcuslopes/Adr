export interface AdrDraft {
  context: string;
  decision: string;
  consequences: string;
}

export async function draftAdr(prompt: string): Promise<AdrDraft> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert software architect helping write Architectural Decision Records (ADRs) in the MADR format.

Given this one-line description of an architectural decision, write the three sections of the ADR:

Decision description: "${prompt}"

Respond with ONLY a JSON object (no markdown fences) in this exact shape:
{
  "context": "...",
  "decision": "...",
  "consequences": "..."
}

Keep each section concise (2-5 sentences). The consequences should include both positive and negative points.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as AdrDraft;
}
