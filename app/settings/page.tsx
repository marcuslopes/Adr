import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { UserSettingsForm } from "./UserSettingsForm";

export default async function UserSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Account settings</h1>
        <p className="text-gray-500 text-sm mb-8">{user.email}</p>
        <UserSettingsForm user={user} />
      </main>
    </div>
  );
}
