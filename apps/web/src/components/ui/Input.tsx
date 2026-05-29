import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-text-muted">{label}</span>
      )}
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-text placeholder:text-text-muted/60 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}
