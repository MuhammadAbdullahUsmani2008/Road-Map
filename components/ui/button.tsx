import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-white shadow-[0_6px_16px_var(--primary-shadow)] hover:bg-[var(--primary-hover)]",
  secondary: "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]",
  ghost: "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-95",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", className = "", children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function IconButton({ className = "", children, "aria-label": ariaLabel, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition duration-200 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
