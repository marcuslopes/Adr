import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Download, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StatusBadge } from "@/components/StatusBadge";
import { toMadr } from "@/lib/madr";

export default async function AdrDetailPage({
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
      author: { select: { id: true, name: true, image: true } },
      supersedes: { select: { id: true, number: true, title: true, slug: true, status: true } },
      supersededBy: { select: { id: true, number: true, title: true, slug: true, status: true } },
      relatedTo: { select: { id: true, number: true, title: true, slug: true, status: true } },
      relatedFrom: { select: { id: true, number: true, title: true, slug: true, status: true } },
      project: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!adr) notFound();

  const markdown = toMadr({
    number: adr.number,
    title: adr.title,
    status: adr.status,
    context: adr.context,
    decision: adr.decision,
    consequences: adr.consequences,
    supersedes: adr.supersedes,
    related: adr.relatedTo,
  });

  const relatedAll = [
    ...adr.relatedTo.map((r) => ({ ...r, direction: "to" as const })),
    ...adr.relatedFrom.map((r) => ({ ...r, direction: "from" as const })),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${params.slug}`}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-400">
                ADR-{String(adr.number).padStart(4, "0")}
              </span>
              <StatusBadge status={adr.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{adr.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
              {adr.author.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={adr.author.image} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span>{adr.author.name ?? "Unknown"}</span>
              <span>·</span>
              <span>{new Date(adr.createdAt).toLocaleDateString()}</span>
              {adr.updatedAt > adr.createdAt && (
                <>
                  <span>·</span>
                  <span>Updated {new Date(adr.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/projects/${params.slug}/adrs/${adr.id}/export`}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export .md
          </a>
          <Link
            href={`/projects/${params.slug}/adrs/${adr.id}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rendered markdown */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        </div>

        {/* Sidebar: links */}
        <div className="space-y-4">
          {adr.supersedes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Supersedes</h3>
              <div className="space-y-2">
                {adr.supersedes.map((s) => (
                  <AdrLinkCard key={s.id} adr={s} projectSlug={params.slug} />
                ))}
              </div>
            </div>
          )}

          {adr.supersededBy.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3">Superseded by</h3>
              <div className="space-y-2">
                {adr.supersededBy.map((s) => (
                  <AdrLinkCard key={s.id} adr={s} projectSlug={params.slug} />
                ))}
              </div>
            </div>
          )}

          {relatedAll.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Related ADRs</h3>
              <div className="space-y-2">
                {relatedAll.map((r) => (
                  <AdrLinkCard key={r.id} adr={r} projectSlug={params.slug} />
                ))}
              </div>
            </div>
          )}

          {/* Raw MADR */}
          <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Raw MADR
            </summary>
            <pre className="mt-3 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {markdown}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function AdrLinkCard({
  adr,
  projectSlug,
}: {
  adr: { id: string; number: number; title: string; status: string };
  projectSlug: string;
}) {
  return (
    <Link
      href={`/projects/${projectSlug}/adrs/${adr.id}`}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <span className="text-xs font-mono text-gray-400 shrink-0">
        {String(adr.number).padStart(4, "0")}
      </span>
      <span className="text-sm text-gray-800 group-hover:text-blue-600 flex-1 truncate">
        {adr.title}
      </span>
      <StatusBadge status={adr.status} />
    </Link>
  );
}
