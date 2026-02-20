import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SettingsForm } from "./SettingsForm";

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">{project.name}</p>

      <SettingsForm project={project} />
    </div>
  );
}
