interface ChartCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    headerControls?: React.ReactNode;
}

export const ChartCard = ({ title, children, className = '', headerControls }: ChartCardProps) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
            {headerControls}
        </div>
        {children}
    </div>
);
