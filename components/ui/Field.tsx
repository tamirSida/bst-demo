import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const controlBase =
  "w-full h-11 rounded bg-surface border border-line px-3 text-ink-900 " +
  "placeholder:text-ink-400 transition-colors " +
  "focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 " +
  "disabled:opacity-50 disabled:bg-surface-muted";

/** Labelled wrapper: label + optional help + required marker + the control. */
export function Field({
  label,
  htmlFor,
  help,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-700">
          {label}
          {required && <span className="text-stop-600 me-1"> *</span>}
        </label>
      )}
      {children}
      {help && <p className="text-xs text-ink-400">{help}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlBase, "h-auto min-h-24 py-2.5 leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "appearance-none bg-none pe-3", className)} {...rest}>
      {children}
    </select>
  );
}
