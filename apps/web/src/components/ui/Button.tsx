import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-brand-600 hover:bg-brand-500 text-white": variant === "primary",
          "bg-surface-muted hover:bg-border border border-border text-text":
            variant === "secondary",
          "hover:bg-surface-muted text-text-muted hover:text-text": variant === "ghost",
          "bg-red-600/90 hover:bg-red-600 text-white": variant === "danger",
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2.5 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
