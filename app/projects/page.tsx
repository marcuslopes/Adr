import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FolderOpen, FileText } from "lucide-react";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: session!.user.id } } },
    include: { _count: { select: { adrs: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your ADR repositories</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first project to start writing ADRs</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-blue-600">{project.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {project.backend === "FILE" ? "File mode" : "Database mode"}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-400 font-medium">
                  {project._count.adrs} ADR{project._count.adrs !== 1 ? "s" : ""}
                </span>
              </div>
              {project.description && (
                <p className="mt-3 text-sm text-gray-500 line-clamp-2">{project.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
