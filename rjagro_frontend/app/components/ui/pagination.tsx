import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Total items, if known — renders the "showing x–y of z" line. */
  total?: number;
  pageSize?: number;
}

export default function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
}: PaginationProps) {
  const from = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to =
    total !== undefined && pageSize ? Math.min(page * pageSize, total) : undefined;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <div className="text-sm text-gray-500">
        {from !== undefined
          ? `Showing ${from}–${to} of ${total} results`
          : `Page ${page} of ${pageCount}`}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
            hover:bg-gray-50 hover:border-gray-400 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronLeft size={15} /> Previous
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`w-9 h-9 rounded-lg text-sm transition-colors ${
              p === page
                ? "bg-green-600 text-white font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
            hover:bg-gray-50 hover:border-gray-400 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
