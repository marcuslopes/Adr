import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify, toMadr } from "@/lib/madr";
import { sendSlackNotification, buildAdrSlackMessage } from "@/lib/notifications/slack";
import { sendAdrEmail } from "@/lib/notifications/email";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(["PROPOSED", "ACCEPTED", "DEPRECATED", "SUPERSEDED"]).default("PROPOSED"),
  context: z.string().min(1),
  decision: z.string().min(1),
  consequences: z.string().min(1),
  supersedesIds: z.array(z.string()).optional(),
  relatedIds: z.array(z.string()).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { slug: params.slug, members: { some: { userId: session.user.id } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const authorId = searchParams.get("authorId");

  const adrs = await prisma.adr.findMany({
    where: {
      projectId: project.id,
      ...(status ? { status: status as "PROPOSED" | "ACCEPTED" | "DEPRECATED" | "SUPERSEDED" } : {}),
      ...(authorId ? { authorId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { context: { contains: search, mode: "insensitive" } },
              { decision: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
      supersedes: { select: { id: true, number: true, title: true, slug: true } },
      relatedTo: { select: { id: true, number: true, title: true, slug: true } },
    },
    orderBy: { number: "desc" },
  });

  return NextResponse.json(adrs);
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { slug: params.slug, members: { some: { userId: session.user.id } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, status, context, decision, consequences, supersedesIds, relatedIds } = parsed.data;

  // Allocate number atomically
  const updatedProject = await prisma.project.update({
    where: { id: project.id },
    data: { nextNumber: { increment: 1 } },
  });
  const number = updatedProject.nextNumber - 1;

  const adrSlug = slugify(title);

  const adr = await prisma.adr.create({
    data: {
      number,
      slug: adrSlug,
      title,
      status,
      context,
      decision,
      consequences,
      authorId: session.user.id,
      projectId: project.id,
      ...(supersedesIds?.length
        ? { supersedes: { connect: supersedesIds.map((id) => ({ id })) } }
        : {}),
      ...(relatedIds?.length
        ? { relatedTo: { connect: relatedIds.map((id) => ({ id })) } }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
      supersedes: { select: { id: true, number: true, title: true, slug: true } },
      relatedTo: { select: { id: true, number: true, title: true, slug: true } },
    },
  });

  // If this supersedes other ADRs, mark them as SUPERSEDED
  if (supersedesIds?.length) {
    await prisma.adr.updateMany({
      where: { id: { in: supersedesIds } },
      data: { status: "SUPERSEDED" },
    });
  }

  // File mode: write markdown file
  if (project.backend === "FILE" && project.filePath) {
    const { writeAdrFile, gitCommitAdr } = await import("@/lib/backends/filesystem");
    const filepath = await writeAdrFile(project.filePath, {
      number,
      title,
      status,
      context,
      decision,
      consequences,
      supersedes: adr.supersedes.map((s) => ({ number: s.number, slug: s.slug, title: s.title })),
      related: adr.relatedTo.map((r) => ({ number: r.number, slug: r.slug, title: r.title })),
    });

    if (project.gitAutoCommit && project.filePath) {
      await gitCommitAdr({
        repoPath: project.filePath,
        filepath,
        adrNumber: number,
        title,
        branch: project.gitBranch,
        token: project.gitToken ?? undefined,
      });
    }
  }

  // Notifications
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const notifOpts = {
    projectName: project.name,
    adrNumber: number,
    title,
    status,
    author: session.user.name ?? session.user.email ?? "Someone",
    appUrl,
    projectSlug: project.slug,
    adrId: adr.id,
  };

  if (project.slackWebhook) {
    await sendSlackNotification(project.slackWebhook, buildAdrSlackMessage(notifOpts)).catch(console.error);
  }
  if (project.notifyEmail) {
    await sendAdrEmail({ to: project.notifyEmail, ...notifOpts }).catch(console.error);
  }

  return NextResponse.json(adr, { status: 201 });
}
