import { LayoutGrid, List } from "lucide-react";

type ViewMode = "grid" | "list";

export default function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-app bg-panel p-1">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`rounded-md p-2 transition ${
          mode === "grid"
            ? "bg-panel2 text-[var(--text)]"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`rounded-md p-2 transition ${
          mode === "list"
            ? "bg-panel2 text-[var(--text)]"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

export type { ViewMode };