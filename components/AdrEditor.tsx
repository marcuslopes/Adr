"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Eye, Pencil, Loader2, ChevronLeft } from "lucide-react";
import { toMadr } from "@/lib/madr";
import { StatusBadge } from "@/components/StatusBadge";

interface AdrLink {
  id: string;
  number: number;
  title: string;
  slug: string;
  status: string;
}

interface Props {
  projectSlug: string;
  existingAdrs: AdrLink[];
  hasAi: boolean;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    status: string;
    context: string;
    decision: string;
    consequences: string;
    supersedesIds: string[];
    relatedIds: string[];
  };
}

const STATUSES = ["PROPOSED", "ACCEPTED", "DEPRECATED", "SUPERSEDED"];

// Mobile tabs: "form" | "preview"
type MobileTab = "form" | "preview";

export function AdrEditor({ projectSlug, existingAdrs, hasAi, mode, initialData }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "PROPOSED");
  const [context, setContext] = useState(initialData?.context ?? "");
  const [decision, setDecision] = useState(initialData?.decision ?? "");
  const [consequences, setConsequences] = useState(initialData?.consequences ?? "");
  const [supersedesIds, setSupersedesIds] = useState<string[]>(initialData?.supersedesIds ?? []);
  const [relatedIds, setRelatedIds] = useState<string[]>(initialData?.relatedIds ?? []);

  const [mobileTab, setMobileTab] = useState<MobileTab>("form");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewMarkdown = toMadr({
    number: 0,
    title: title || "Untitled",
    status,
    context: context || "_No context yet_",
    decision: decision || "_No decision yet_",
    consequences: consequences || "_No consequences yet_",
    supersedes: existingAdrs
      .filter((a) => supersedesIds.includes(a.id))
      .map((a) => ({ number: a.number, slug: a.slug, title: a.title })),
    related: existingAdrs
      .filter((a) => relatedIds.includes(a.id))
      .map((a) => ({ number: a.number, slug: a.slug, title: a.title })),
  });

  async function handleAiDraft() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "AI drafting failed");
      }
      const draft = await res.json();
      setContext(draft.context);
      setDecision(draft.decision);
      setConsequences(draft.consequences);
      setShowAiInput(false);
      setAiPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI drafting failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const url =
      mode === "create"
        ? `/api/projects/${projectSlug}/adrs`
        : `/api/projects/${projectSlug}/adrs/${initialData!.id}`;

    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status,
        context,
        decision,
        consequences,
        supersedesIds,
        relatedIds,
      }),
    });

    if (res.ok) {
      const adr = await res.json();
      router.push(`/projects/${projectSlug}/adrs/${adr.id}`);
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Something went wrong");
      setSaving(false);
    }
  }

  function toggleLink(id: string, arr: string[], setter: (v: string[]) => void) {
    setter(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  const formattedNumber = mode === "edit" && initialData
    ? String((initialData as { id: string }).id).slice(0, 4)  // not the real number but a placeholder
    : "XXXX";

  return (
    <div className="space-y-4">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Title + status row */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="text-sm font-mono text-gray-400 shrink-0">ADR-{formattedNumber}</span>
          <input
            type="text"
            placeholder="Decision title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-0 text-base sm:text-lg font-semibold px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="shrink-0 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {hasAi && (
            <button
              onClick={() => setShowAiInput((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Draft</span>
            </button>
          )}
          {/* Mobile tab toggle */}
          <button
            onClick={() => setMobileTab((t) => t === "form" ? "preview" : "form")}
            className="flex lg:hidden items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {mobileTab === "form" ? (
              <><Eye className="w-4 h-4" /> Preview</>
            ) : (
              <><Pencil className="w-4 h-4" /> Edit</>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "Create ADR" : "Save"}
          </button>
        </div>
      </div>

      {/* ── AI prompt bar ───────────────────────────────────── */}
      {showAiInput && (
        <div className="flex flex-col sm:flex-row gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <input
            type="text"
            placeholder='e.g. "Use Redis for session caching instead of in-memory store"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiDraft()}
            className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={handleAiDraft}
            disabled={aiLoading || !aiPrompt.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiLoading ? "Drafting…" : "Draft"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      {/* Desktop: side-by-side. Mobile: tabbed. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Form panel */}
        <div className={`space-y-4 ${mobileTab === "preview" ? "hidden lg:block" : ""}`}>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-5">
            <Field label="Context" hint="What is the situation that motivated this decision?">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={5}
                placeholder="Describe the forces at play, constraints, and background..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </Field>

            <Field label="Decision" hint="What was decided?">
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                rows={5}
                placeholder="We will use ... because ..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </Field>

            <Field label="Consequences" hint="What are the resulting trade-offs?">
              <textarea
                value={consequences}
                onChange={(e) => setConsequences(e.target.value)}
                rows={5}
                placeholder="Positive: ...&#10;Negative: ..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </Field>
          </div>

          {/* Link panel */}
          {existingAdrs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Links</h3>

              <LinkSelector
                label="Supersedes"
                hint="This ADR replaces these older ADRs"
                adrs={existingAdrs.filter((a) => !relatedIds.includes(a.id))}
                selected={supersedesIds}
                onToggle={(id) => toggleLink(id, supersedesIds, setSupersedesIds)}
              />

              <LinkSelector
                label="Related to"
                hint="This ADR is related to (but does not supersede) these ADRs"
                adrs={existingAdrs.filter((a) => !supersedesIds.includes(a.id))}
                selected={relatedIds}
                onToggle={(id) => toggleLink(id, relatedIds, setRelatedIds)}
              />
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-5 ${mobileTab === "form" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">MADR Preview</span>
            {/* Back to form button — mobile only */}
            <button
              onClick={() => setMobileTab("form")}
              className="flex lg:hidden items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
            >
              <ChevronLeft className="w-3 h-3" />
              Back to form
            </button>
          </div>
          <div className="prose max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMarkdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-0.5">{label}</label>
      <p className="text-xs text-gray-400 mb-1.5">{hint}</p>
      {children}
    </div>
  );
}

function LinkSelector({
  label,
  hint,
  adrs,
  selected,
  onToggle,
}: {
  label: string;
  hint: string;
  adrs: AdrLink[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {adrs.map((adr) => (
          <label
            key={adr.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selected.includes(adr.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(adr.id)}
              onChange={() => onToggle(adr.id)}
              className="accent-blue-600"
            />
            <span className="text-xs font-mono text-gray-400 shrink-0">
              {String(adr.number).padStart(4, "0")}
            </span>
            <span className="text-sm text-gray-800 flex-1 truncate">{adr.title}</span>
            <StatusBadge status={adr.status} />
          </label>
        ))}
      </div>
    </div>
  );
}
