interface ChartCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const ChartCard = ({ title, children, className = '' }: ChartCardProps) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
        {children}
    </div>
);
