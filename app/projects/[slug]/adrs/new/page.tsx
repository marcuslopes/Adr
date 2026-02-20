import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdrEditor } from "@/components/AdrEditor";

export default async function NewAdrPage({
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

  // Existing ADRs for linking
  const existingAdrs = await prisma.adr.findMany({
    where: { projectId: project.id },
    select: { id: true, number: true, title: true, slug: true, status: true },
    orderBy: { number: "asc" },
  });

  const hasAi = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">New ADR — {project.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Document an architectural decision</p>
      </div>
      <AdrEditor
        projectSlug={project.slug}
        existingAdrs={existingAdrs}
        hasAi={hasAi}
        mode="create"
      />
    </div>
  );
}
