import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/projects");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <h1 className="text-3xl font-bold text-gray-900">ADR Manager</h1>
          <p className="mt-2 text-gray-500">Architectural Decision Records for your team</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
