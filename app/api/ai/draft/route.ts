import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { draftAdr } from "@/lib/ai";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const schema = z.object({ prompt: z.string().min(5).max(500) });

// 10 AI drafts per user per hour
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI drafting is not configured" }, { status: 503 });
  }

  const { allowed, remaining, resetAt } = rateLimit(`ai:draft:${session.user.id}`, {
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again after ${new Date(resetAt).toLocaleTimeString()}.` },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
        },
      }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const draft = await draftAdr(parsed.data.prompt);

  return NextResponse.json(draft, {
    headers: {
      "X-RateLimit-Limit": String(LIMIT),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
    },
  });
}
