"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    backend: "DATABASE",
    filePath: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const project = await res.json();
      router.push(`/projects/${project.slug}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="My Service"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What is this project about?"
          rows={2}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Storage backend</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "DATABASE", label: "Database", desc: "Central PostgreSQL store" },
            { value: "FILE", label: "Markdown files", desc: "Write .md files to disk" },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer border rounded-lg p-3 transition-colors ${
                form.backend === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="backend"
                value={opt.value}
                checked={form.backend === opt.value}
                onChange={(e) => set("backend", e.target.value)}
                className="sr-only"
              />
              <div className="font-medium text-sm text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </label>
          ))}
        </div>
      </div>

      {form.backend === "FILE" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Directory path</label>
          <input
            type="text"
            value={form.filePath}
            onChange={(e) => set("filePath", e.target.value)}
            placeholder="/path/to/repo/docs/adr"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Absolute path to the directory where .md files will be written</p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !form.name}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm font-medium"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
