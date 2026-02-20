import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsForm } from "./SettingsForm";
import { MembersPanel } from "./MembersPanel";

export default async function SettingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getServerSession(authOptions);

  const project = await prisma.project.findFirst({
    where: {
      slug: params.slug,
      members: { some: { userId: session!.user.id } },
    },
  });

  if (!project) notFound();

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const isOwner = members.some(
    (m) => m.userId === session!.user.id && m.role === "OWNER"
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/projects/${project.slug}`}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">{project.name}</p>
        </div>
      </div>

      <div className="space-y-6">
        <SettingsForm project={project} />
        <MembersPanel
          projectSlug={project.slug}
          members={members}
          currentUserId={session!.user.id}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
