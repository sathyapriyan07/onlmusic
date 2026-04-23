import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
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
        <mark className="bg-[var(--accent)]/30 text-[var(--text)]">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const getImage = (r: Result) => {
    if (r.type === "song") return resolveImageSrc({ url: r.image, bucket: "song-covers" });
    if (r.type === "album") return resolveImageSrc({ url: r.image, bucket: "album-covers" });
    return resolveImageSrc({ url: r.image, bucket: "artist-images" });
  };

  const getTypeColor = (_type: string) => "text-[var(--text-secondary)]";

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 bg-[var(--elevated)] rounded-full px-4 py-2.5">
        <Search className="h-4 w-4 text-[var(--text-secondary)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs, albums, artists…"
          className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-xl bg-[var(--elevated)] shadow-lg">
          {results.map((r, idx) => {
            const path = r.type === "song" ? "/songs" : r.type === "album" ? "/albums" : "/artists";
            return (
              <Link
                key={`${r.type}-${r.id}`}
                to={`${path}/${r.id}`}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 transition",
                  idx === selectedIdx ? "bg-[var(--hover)]" : "",
                )}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--hover)]">
                  {r.image && <img src={getImage(r)} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-[var(--text)]">{highlightMatch(r.title)}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={getTypeColor(r.type)}>{r.type}</span>
                    {r.subtitle && <span className="text-[var(--text-secondary)]">· {r.subtitle}</span>}
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