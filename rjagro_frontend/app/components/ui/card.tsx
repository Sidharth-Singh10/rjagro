import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200/70 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
