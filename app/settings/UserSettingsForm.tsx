"use client";

import { useState } from "react";
import { Save, Loader2, Github, Mail } from "lucide-react";

interface UserProps {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  accounts: { provider: string }[];
}

export function UserSettingsForm({ user }: { user: UserProps }) {
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
    setSaving(false);
  }

  const providers = user.accounts.map((a) => a.provider);

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">Profile</h2>

        <div className="flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-16 h-16 rounded-full border border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user.name ?? "—"}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              className="input"
              placeholder="Your name"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
          )}
          {saved && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">Name updated.</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      {/* Connected accounts */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">Connected accounts</h2>

        <div className="space-y-2">
          <ConnectedAccount
            provider="github"
            label="GitHub"
            icon={<Github className="w-4 h-4" />}
            connected={providers.includes("github")}
          />
          <ConnectedAccount
            provider="email"
            label="Magic link email"
            icon={<Mail className="w-4 h-4" />}
            connected={providers.includes("email") || Boolean(user.email)}
          />
        </div>
      </div>
    </div>
  );
}

function ConnectedAccount({
  label,
  icon,
  connected,
}: {
  provider: string;
  label: string;
  icon: React.ReactNode;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3">
        <span className="text-gray-600">{icon}</span>
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </div>
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          connected
            ? "bg-green-100 text-green-700"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {connected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}
