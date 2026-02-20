import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendSlackNotification, buildAdrSlackMessage } from "@/lib/notifications/slack";
import { sendAdrEmail } from "@/lib/notifications/email";

async function getAdrForUser(id: string, projectSlug: string, userId: string) {
  return prisma.adr.findFirst({
    where: {
      id,
      project: {
        slug: projectSlug,
        members: { some: { userId } },
      },
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
      supersedes: { select: { id: true, number: true, title: true, slug: true, status: true } },
      supersededBy: { select: { id: true, number: true, title: true, slug: true, status: true } },
      relatedTo: { select: { id: true, number: true, title: true, slug: true, status: true } },
      relatedFrom: { select: { id: true, number: true, title: true, slug: true, status: true } },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          slackWebhook: true,
          notifyEmail: true,
        },
      },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adr = await getAdrForUser(params.id, params.slug, session.user.id);
  if (!adr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(adr);
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["PROPOSED", "ACCEPTED", "DEPRECATED", "SUPERSEDED"]).optional(),
  context: z.string().min(1).optional(),
  decision: z.string().min(1).optional(),
  consequences: z.string().min(1).optional(),
  supersedesIds: z.array(z.string()).optional(),
  relatedIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adr = await getAdrForUser(params.id, params.slug, session.user.id);
  if (!adr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const previousStatus = adr.status;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supersedesIds, relatedIds, ...fields } = parsed.data;

  const updated = await prisma.adr.update({
    where: { id: adr.id },
    data: {
      ...fields,
      ...(supersedesIds !== undefined
        ? { supersedes: { set: supersedesIds.map((id) => ({ id })) } }
        : {}),
      ...(relatedIds !== undefined
        ? { relatedTo: { set: relatedIds.map((id) => ({ id })) } }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
      supersedes: { select: { id: true, number: true, title: true, slug: true, status: true } },
      supersededBy: { select: { id: true, number: true, title: true, slug: true, status: true } },
      relatedTo: { select: { id: true, number: true, title: true, slug: true, status: true } },
      relatedFrom: { select: { id: true, number: true, title: true, slug: true, status: true } },
    },
  });

  // If supersedes changed, mark superseded ADRs
  if (supersedesIds?.length) {
    await prisma.adr.updateMany({
      where: { id: { in: supersedesIds } },
      data: { status: "SUPERSEDED" },
    });
  }

  // Send notifications if status changed
  const newStatus = updated.status;
  if (fields.status && newStatus !== previousStatus && adr.project) {
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const notifOpts = {
      projectName: adr.project.name,
      adrNumber: adr.number,
      title: updated.title,
      status: newStatus,
      author: session.user.name ?? session.user.email ?? "Someone",
      appUrl,
      projectSlug: adr.project.slug,
      adrId: adr.id,
    };

    if (adr.project.slackWebhook) {
      await sendSlackNotification(
        adr.project.slackWebhook,
        {
          ...buildAdrSlackMessage(notifOpts),
          text: `Status changed on *${adr.project.name}*: ADR-${String(adr.number).padStart(4, "0")} is now \`${newStatus}\``,
        }
      ).catch(console.error);
    }

    if (adr.project.notifyEmail) {
      await sendAdrEmail({ to: adr.project.notifyEmail, ...notifOpts }).catch(console.error);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adr = await getAdrForUser(params.id, params.slug, session.user.id);
  if (!adr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.adr.delete({ where: { id: adr.id } });

  return NextResponse.json({ ok: true });
}
