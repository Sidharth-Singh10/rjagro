interface TableSkeletonRowsProps {
    /** Number of placeholder rows. */
    rows?: number;
    /** Number of table columns (used to render matching cells). */
    cols: number;
}

/**
 * Shimmer placeholder rows shown while a table's data is loading.
 * Renders <tr> elements — place inside <tbody>.
 */
export default function TableSkeletonRows({ rows = 5, cols }: TableSkeletonRowsProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="animate-pulse" aria-hidden>
                    {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className="px-4 py-3.5">
                            <div
                                className="h-4 bg-gray-200/80 rounded"
                                style={{ width: `${55 + ((r * 13 + c * 29) % 40)}%` }}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
