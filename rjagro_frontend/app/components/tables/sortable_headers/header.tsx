import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

const iconMap = {
  ArrowUp: ArrowUp,
  ArrowDown: ArrowDown,
  ArrowUpDown: ArrowUpDown,
};

interface SortableHeaderProps<T> {
  columnKey: keyof T;
  children: React.ReactNode;
  className?: string;
  requestSort: (key: keyof T) => void;
  getSortIcon: (key: keyof T) => React.ReactNode;
  isSortable?: boolean;
}

const SortableHeader = <T,>({
  columnKey,
  children,
  className = "",
  requestSort,
  getSortIcon,
  isSortable = false,
}: SortableHeaderProps<T>) => {

  const iconKey = getSortIcon(columnKey);
  const Icon = iconMap[iconKey as keyof typeof iconMap];


  return (
    <th
      onClick={() => isSortable && requestSort(columnKey)}
      className={`px-4 py-3 text-left text-xs font-medium uppercase ${isSortable ? 'cursor-pointer select-none' : ''
        }`}
    >
      <div className="flex items-center gap-1 text-gray-500">
        {children}
        {isSortable && Icon && (
          <Icon className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </th>
  );
};

export default SortableHeader;
