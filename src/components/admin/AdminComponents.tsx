import type { ReactNode } from "react";
import { X } from "lucide-react";

interface AdminCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function AdminCard({ title, action, children }: AdminCardProps) {
  return (
    <div className="bg-panel rounded-2xl border border-app overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-app">
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function AdminModal({ open, onClose, title, children }: AdminModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-panel rounded-2xl border border-app max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-[var(--text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

interface FormActionsProps {
  children: ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return <div className="flex gap-3 pt-4">{children}</div>;
}

interface AdminEmptyProps {
  title: string;
  description?: string;
}

export function AdminEmpty({ title, description }: AdminEmptyProps) {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--muted)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-dim)] mt-1">{description}</p>}
    </div>
  );
}

interface AdminButtonProps {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

export function AdminButton({ variant = "primary", children, onClick, type = "button", disabled, className = "" }: AdminButtonProps) {
  const base = "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--accent)] text-black",
    secondary: "bg-white/10 text-[var(--text)]",
    danger: "bg-red-500/20 text-red-400",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

interface DataTableProps {
  headers: string[];
  children: ReactNode;
}

export function DataTable({ headers, children }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-app">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}