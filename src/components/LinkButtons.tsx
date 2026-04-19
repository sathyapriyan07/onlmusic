import type { Link } from "../lib/types";
import { normalizePlatform, platformSortKey } from "../lib/platforms";
import PlatformLogo from "./PlatformLogo";

const categoryLabels: Record<string, string> = {
  official: "Official",
  live: "Live",
  lyrics: "Lyrics",
  covers: "Covers",
  other: "Other",
};

function getCategoryLinks(links: Link[]) {
  const categorized: Record<string, Link[]> = {
    official: [],
    live: [],
    lyrics: [],
    covers: [],
    other: [],
  };

  const uncategorized: Link[] = [];

  for (const link of links) {
    if (link.category && categorized[link.category]) {
      categorized[link.category].push(link);
    } else {
      uncategorized.push(link);
    }
  }

  return { categorized, uncategorized };
}

export default function LinkButtons({ links }: { links: Link[] }) {
  const { categorized, uncategorized } = getCategoryLinks(links);
  const hasCategories = Object.values(categorized).some((arr) => arr.length > 0);
  const hasUncategorized = uncategorized.length > 0;

  if (!hasCategories && !hasUncategorized) return null;

  if (!hasCategories) {
    const sorted = [...uncategorized].sort((a, b) => platformSortKey(a.platform) - platformSortKey(b.platform));
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

  return (
    <div className="space-y-4">
      {Object.entries(categorized).map(([category, catLinks]) => {
        if (catLinks.length === 0) return null;
        const sorted = [...catLinks].sort((a, b) => platformSortKey(a.platform) - platformSortKey(b.platform));
        return (
          <div key={category}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {categoryLabels[category]}
            </div>
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
          </div>
        );
      })}
      {hasUncategorized && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Other</div>
          <div className="flex flex-wrap gap-2">
            {uncategorized.map((l) => (
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
        </div>
      )}
    </div>
  );
}
