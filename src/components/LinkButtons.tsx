import type { Link } from "../lib/types";
import { normalizePlatform, platformSortKey } from "../lib/platforms";
import PlatformLogo from "./PlatformLogo";

export default function LinkButtons({ links }: { links: Link[] }) {
  const sorted = [...links].sort((a, b) => platformSortKey(a.platform) - platformSortKey(b.platform));

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-panel2 px-3 py-2 text-sm text-[var(--text)] hover:bg-white/10"
        >
          <span className="text-muted">
            <PlatformLogo platform={l.platform} className="h-4 w-4" />
          </span>
          {normalizePlatform(l.platform)}
        </a>
      ))}
    </div>
  );
}
