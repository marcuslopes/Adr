import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toMadr, adrFilename } from "@/lib/madr";

/** GET /api/projects/[slug]/export — download all ADRs as a zip archive */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { slug: params.slug, members: { some: { userId: session.user.id } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adrs = await prisma.adr.findMany({
    where: { projectId: project.id },
    include: {
      supersedes: { select: { number: true, slug: true, title: true } },
      relatedTo: { select: { number: true, slug: true, title: true } },
    },
    orderBy: { number: "asc" },
  });

  const buildMd = (adr: (typeof adrs)[number]) =>
    toMadr({
      number: adr.number,
      title: adr.title,
      status: adr.status,
      context: adr.context,
      decision: adr.decision,
      consequences: adr.consequences,
      supersedes: adr.supersedes,
      related: adr.relatedTo,
    });

  try {
    const { zipSync, strToU8 } = await import("fflate");
    const files: Record<string, Uint8Array> = {};

    for (const adr of adrs) {
      const md = buildMd(adr);
      const filename = adrFilename(adr.number, adr.slug);
      files[filename] = strToU8(md);
    }

    const buf = zipSync(files);
    // Cast via ArrayBuffer to satisfy strict TS lib dom typings
    const blob = new Blob([buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer], {
      type: "application/zip",
    });

    return new Response(blob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.slug}-adrs.zip"`,
      },
    });
  } catch {
    // fflate unavailable — fall back to concatenated markdown
    const combined = adrs.map(buildMd).join("\n\n---\n\n");
    return new Response(combined, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.slug}-adrs.md"`,
      },
    });
  }
}
