import { Search } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-full border border-app bg-panel px-4 py-3 shadow-card">
      <Search className="h-4 w-4 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
      />
    </label>
  );
}
