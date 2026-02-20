import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
});

/** GET /api/projects/[slug]/members — list members */
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

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

/** POST /api/projects/[slug]/members — invite a user by email */
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { slug: params.slug, members: { some: { userId: session.user.id, role: "OWNER" } } },
  });
  if (!project) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email } = parsed.data;

  // Find the user by email (they must have signed up already)
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    return NextResponse.json(
      { error: "No account found with that email. They must sign in first." },
      { status: 404 }
    );
  }

  // Check if already a member
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: targetUser.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const member = await prisma.projectMember.create({
    data: { projectId: project.id, userId: targetUser.id, role: "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  // Send notification email if configured
  if (process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails
      .send({
        from: process.env.NOTIFICATION_FROM_EMAIL ?? "noreply@example.com",
        to: email,
        subject: `You've been added to ${project.name} on ADR Manager`,
        html: `
          <p>Hi ${targetUser.name ?? "there"},</p>
          <p>You've been added as a member of <strong>${project.name}</strong> on ADR Manager.</p>
          <p><a href="${appUrl}/projects/${project.slug}">View the project →</a></p>
        `,
      })
      .catch(console.error);
  }

  return NextResponse.json(member, { status: 201 });
}
