"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FileText, LogOut, User, Settings } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link href="/projects" className="flex items-center gap-2 font-semibold text-gray-900 hover:text-blue-600">
        <FileText className="w-5 h-5 text-blue-600" />
        ADR Manager
      </Link>

      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <Link href="/settings" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <User className="w-4 h-4" />
              )}
              {session.user.name ?? session.user.email}
              <Settings className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
