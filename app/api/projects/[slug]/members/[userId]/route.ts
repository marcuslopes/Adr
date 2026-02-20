import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/projects/[slug]/members/[userId] — remove a member */
export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { slug: params.slug, members: { some: { userId: session.user.id, role: "OWNER" } } },
  });
  if (!project) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  // Can't remove yourself if you're the only owner
  if (params.userId === session.user.id) {
    const ownerCount = await prisma.projectMember.count({
      where: { projectId: project.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner of a project" },
        { status: 400 }
      );
    }
  }

  await prisma.projectMember.deleteMany({
    where: { projectId: project.id, userId: params.userId },
  });

  return NextResponse.json({ ok: true });
}
