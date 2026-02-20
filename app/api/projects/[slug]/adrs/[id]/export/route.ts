import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toMadr } from "@/lib/madr";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adr = await prisma.adr.findFirst({
    where: {
      id: params.id,
      project: { slug: params.slug, members: { some: { userId: session.user.id } } },
    },
    include: {
      supersedes: { select: { number: true, slug: true, title: true } },
      relatedTo:  { select: { number: true, slug: true, title: true } },
    },
  });

  if (!adr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const markdown = toMadr({
    number: adr.number,
    title: adr.title,
    status: adr.status,
    context: adr.context,
    decision: adr.decision,
    consequences: adr.consequences,
    supersedes: adr.supersedes,
    related: adr.relatedTo,
  });

  const filename = `${String(adr.number).padStart(4, "0")}-${adr.slug}.md`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
