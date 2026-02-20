import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getProjectForUser(slug: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      slug,
      members: { some: { userId } },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: {
      slug: params.slug,
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { adrs: true } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(project);
}

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  backend: z.enum(["DATABASE", "FILE"]).optional(),
  filePath: z.string().optional(),
  gitAutoCommit: z.boolean().optional(),
  gitBranch: z.string().optional(),
  gitToken: z.string().optional(),
  slackWebhook: z.string().url().optional().or(z.literal("")),
  notifyEmail: z.string().email().optional().or(z.literal("")),
});

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getProjectForUser(params.slug, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getProjectForUser(params.slug, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check owner
  const membership = await prisma.projectMember.findFirst({
    where: { projectId: project.id, userId: session.user.id, role: "OWNER" },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.project.delete({ where: { id: project.id } });

  return NextResponse.json({ ok: true });
}
