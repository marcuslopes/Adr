import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, Download } from "lucide-react";
import { AdrListClient } from "./AdrListClient";

export default async function ProjectPage({
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
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!project) notFound();

  const adrs = await prisma.adr.findMany({
    where: { projectId: project.id },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
    orderBy: { number: "desc" },
  });

  const authors = project.members.map((m) => m.user);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-1 text-sm">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/projects/${project.slug}/export`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Export all ADRs as ZIP"
          >
            <Download className="w-4 h-4" />
            Export all
          </a>
          <Link
            href={`/projects/${project.slug}/settings`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <Link
            href={`/projects/${project.slug}/adrs/new`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New ADR
          </Link>
        </div>
      </div>

      <AdrListClient adrs={adrs} authors={authors} projectSlug={project.slug} />
    </div>
  );
}
