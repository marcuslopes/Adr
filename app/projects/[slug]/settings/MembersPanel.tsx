"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Loader2, User } from "lucide-react";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function MembersPanel({
  projectSlug,
  members,
  currentUserId,
  isOwner,
}: {
  projectSlug: string;
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    const res = await fetch(`/api/projects/${projectSlug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      const member = await res.json();
      setInviteSuccess(`${member.user.name ?? email} added to the project.`);
      setEmail("");
      router.refresh();
    } else {
      const data = await res.json();
      setInviteError(data.error ?? "Failed to add member");
    }
    setInviting(false);
  }

  async function handleRemove(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from this project?`)) return;
    setRemovingId(userId);

    const res = await fetch(`/api/projects/${projectSlug}/members/${userId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to remove member");
    }
    setRemovingId(null);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">
        Members ({members.length})
      </h2>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              {m.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.user.image} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {m.user.name ?? m.user.email ?? "—"}
                  {m.userId === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </p>
                {m.user.name && m.user.email && (
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  m.role === "OWNER"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
              </span>

              {isOwner && m.userId !== currentUserId && (
                <button
                  onClick={() => handleRemove(m.userId, m.user.name ?? m.user.email ?? "user")}
                  disabled={removingId === m.userId}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  title="Remove member"
                >
                  {removingId === m.userId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite (owners only) */}
      {isOwner && (
        <>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Add member by email</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setInviteError(null);
                  setInviteSuccess(null);
                }}
                placeholder="colleague@company.com"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={inviting || !email}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 shrink-0"
              >
                {inviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-1.5">
              The user must have already signed in to ADR Manager.
            </p>
          </div>

          {inviteError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {inviteSuccess}
            </p>
          )}
        </>
      )}
    </div>
  );
}
