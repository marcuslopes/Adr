"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  backend: string;
  filePath: string | null;
  gitAutoCommit: boolean;
  gitBranch: string;
  gitToken: string | null;
  slackWebhook: string | null;
  notifyEmail: string | null;
}

export function SettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    backend: project.backend,
    filePath: project.filePath ?? "",
    gitAutoCommit: project.gitAutoCommit,
    gitBranch: project.gitBranch,
    gitToken: project.gitToken ?? "",
    slackWebhook: project.slackWebhook ?? "",
    notifyEmail: project.notifyEmail ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const set = (k: string, v: string | boolean) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/projects/${project.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete project "${project.name}"? This will remove all ADRs. This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${project.slug}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/projects");
    } else {
      alert("Failed to delete project");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* General */}
      <Section title="General">
        <div>
          <label className="label">Project name</label>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="input resize-none" />
        </div>
      </Section>

      {/* Storage */}
      <Section title="Storage backend">
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "DATABASE", label: "Database", desc: "PostgreSQL" },
            { value: "FILE", label: "Markdown files", desc: "Write .md to disk" },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer border rounded-lg p-3 transition-colors ${
                form.backend === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input type="radio" name="backend" value={opt.value} checked={form.backend === opt.value} onChange={(e) => set("backend", e.target.value)} className="sr-only" />
              <div className="font-medium text-sm text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </label>
          ))}
        </div>

        {form.backend === "FILE" && (
          <div>
            <label className="label">Directory path</label>
            <input type="text" value={form.filePath} onChange={(e) => set("filePath", e.target.value)} placeholder="/path/to/repo/docs/adr" className="input font-mono" />
          </div>
        )}
      </Section>

      {/* Git auto-commit (file mode only) */}
      {form.backend === "FILE" && (
        <Section title="Git auto-commit">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.gitAutoCommit}
              onChange={(e) => set("gitAutoCommit", e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">Automatically commit and push new ADRs to git</span>
          </label>

          {form.gitAutoCommit && (
            <>
              <div>
                <label className="label">Branch</label>
                <input type="text" value={form.gitBranch} onChange={(e) => set("gitBranch", e.target.value)} placeholder="main" className="input" />
              </div>
              <div>
                <label className="label">Personal access token (for push auth)</label>
                <input type="password" value={form.gitToken} onChange={(e) => set("gitToken", e.target.value)} placeholder="ghp_..." className="input" />
                <p className="text-xs text-gray-400 mt-1">Stored encrypted. Needs repo write permission.</p>
              </div>
            </>
          )}
        </Section>
      )}

      {/* Notifications */}
      <Section title="Notifications">
        <div>
          <label className="label">Slack webhook URL</label>
          <input type="url" value={form.slackWebhook} onChange={(e) => set("slackWebhook", e.target.value)} placeholder="https://hooks.slack.com/services/..." className="input" />
          <p className="text-xs text-gray-400 mt-1">Post a message when an ADR is created or its status changes</p>
        </div>
        <div>
          <label className="label">Notification email</label>
          <input type="email" value={form.notifyEmail} onChange={(e) => set("notifyEmail", e.target.value)} placeholder="eng-decisions@company.com" className="input" />
          <p className="text-xs text-gray-400 mt-1">Send an email on new ADRs (requires RESEND_API_KEY)</p>
        </div>
      </Section>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      {saved && (
        <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">Settings saved.</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-60"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete project
        </button>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}
