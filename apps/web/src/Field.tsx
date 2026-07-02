import type { ReactNode } from "react";

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500";
