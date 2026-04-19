import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import clsx from "clsx";
import { searchAll } from "../lib/db";
import { resolveImageSrc } from "../lib/images";

type Result = {
  type: "song" | "album" | "artist";
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
};

export default function UnifiedSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const r = await searchAll(query);
        setResults(r);
        setSelectedIdx(0);
      } catch {
        // ignore errors
      }
    }, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && results.length > 0) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      const r = results[selectedIdx];
      const path = r.type === "song" ? "/songs" : r.type === "album" ? "/albums" : "/artists";
      window.location.href = `${path}/${r.id}`;
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-[var(--accent)] text-black">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

const getImage = (r: Result) => {
  if (r.type === "song") return resolveImageSrc({ url: r.image, bucket: "song-covers" });
  if (r.type === "album") return resolveImageSrc({ url: r.image, bucket: "album-covers" });
  return resolveImageSrc({ url: r.image, bucket: "artist-images" });
};

  return (
    <div className="relative">
      <label className="flex items-center gap-3 rounded-full border border-subtle bg-surface px-4 py-3 transition focus-within:border-pink-500">
        <Search className="h-4 w-4 text-secondary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs, albums, artists…"
          className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-tertiary"
        />
      </label>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-2xl border border-subtle bg-elevated shadow-soft">
          {results.map((r, idx) => {
            const path = r.type === "song" ? "/songs" : r.type === "album" ? "/albums" : "/artists";
            return (
              <Link
                key={`${r.type}-${r.id}`}
                to={`${path}/${r.id}`}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 transition",
                  idx === selectedIdx ? "bg-surface" : "hover:bg-surface",
                )}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {r.image && <img src={getImage(r)} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-primary">{highlightMatch(r.title)}</div>
                  <div className="flex items-center gap-2 text-xs text-tertiary">
                    <span className="capitalize">{r.type}</span>
                    {r.subtitle && <span>· {r.subtitle}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}