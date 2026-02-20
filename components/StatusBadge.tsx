const STATUS_STYLES: Record<string, string> = {
  PROPOSED:   "bg-blue-100 text-blue-800",
  ACCEPTED:   "bg-green-100 text-green-800",
  DEPRECATED: "bg-gray-200 text-gray-700",
  SUPERSEDED: "bg-yellow-100 text-yellow-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
