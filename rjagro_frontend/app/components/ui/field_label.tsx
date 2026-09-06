import type { ReactNode } from "react";

export default function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
    return (
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
            {children} {required && <span className="text-red-500">*</span>}
        </label>
    );
}
