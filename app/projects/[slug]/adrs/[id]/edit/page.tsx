import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdrEditor } from "@/components/AdrEditor";

export default async function EditAdrPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const session = await getServerSession(authOptions);

  const adr = await prisma.adr.findFirst({
    where: {
      id: params.id,
      project: {
        slug: params.slug,
        members: { some: { userId: session!.user.id } },
      },
    },
    include: {
      supersedes: { select: { id: true } },
      relatedTo: { select: { id: true } },
    },
  });

  if (!adr) notFound();

  const allAdrs = await prisma.adr.findMany({
    where: {
      projectId: adr.projectId,
      NOT: { id: adr.id },
    },
    select: { id: true, number: true, title: true, slug: true, status: true },
    orderBy: { number: "asc" },
  });

  const hasAi = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Edit ADR-{String(adr.number).padStart(4, "0")}: {adr.title}
        </h1>
      </div>
      <AdrEditor
        projectSlug={params.slug}
        existingAdrs={allAdrs}
        hasAi={hasAi}
        mode="edit"
        initialData={{
          id: adr.id,
          title: adr.title,
          status: adr.status,
          context: adr.context,
          decision: adr.decision,
          consequences: adr.consequences,
          supersedesIds: adr.supersedes.map((s) => s.id),
          relatedIds: adr.relatedTo.map((r) => r.id),
        }}
      />
    </div>
  );
}
