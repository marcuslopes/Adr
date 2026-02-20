"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FileText, User, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface AdrSummary {
  id: string;
  number: number;
  slug: string;
  title: string;
  status: string;
  createdAt: string | Date;
  author: { id: string; name: string | null; image: string | null };
}

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

const STATUSES = ["PROPOSED", "ACCEPTED", "DEPRECATED", "SUPERSEDED"];

export function AdrListClient({
  adrs,
  authors,
  projectSlug,
}: {
  adrs: AdrSummary[];
  authors: Author[];
  projectSlug: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const hasFilters = search || statusFilter || authorFilter || dateFrom || dateTo;

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setAuthorFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    // dateTo is inclusive: extend to end of that day
    const toTs = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : null;

    return adrs.filter((adr) => {
      if (statusFilter && adr.status !== statusFilter) return false;
      if (authorFilter && adr.author.id !== authorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !adr.title.toLowerCase().includes(q) &&
          !String(adr.number).includes(q)
        )
          return false;
      }
      if (fromTs !== null || toTs !== null) {
        const ts = new Date(adr.createdAt).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      return true;
    });
  }, [adrs, search, statusFilter, authorFilter, dateFrom, dateTo]);

  if (adrs.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">No ADRs yet</p>
        <p className="text-gray-400 text-sm mt-1">Create your first architectural decision record</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title or number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          {/* Author */}
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? "Unknown"}
              </option>
            ))}
          </select>
        </div>

        {/* Date range (second row) */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500 shrink-0">Date range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="From date"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="To date"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ADR table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-16">#</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">Author</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    No ADRs match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((adr) => (
                  <tr key={adr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">
                      {String(adr.number).padStart(4, "0")}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${projectSlug}/adrs/${adr.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {adr.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={adr.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {adr.author.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={adr.author.image} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <User className="w-4 h-4 text-gray-300" />
                        )}
                        <span className="text-sm text-gray-600">{adr.author.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(adr.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-right">
        {filtered.length} of {adrs.length} ADR{adrs.length !== 1 ? "s" : ""}
        {hasFilters && " (filtered)"}
      </p>
    </div>
  );
}
