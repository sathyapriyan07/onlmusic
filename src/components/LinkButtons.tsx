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

  const renderLink = (l: Link) => (
    <a
      key={l.id}
      href={l.url}
      target="_blank"
      rel="noreferrer"
      className="link-pill"
    >
      <PlatformLogo platform={l.platform} className="h-4 w-4" />
      <span>{normalizePlatform(l.platform)}</span>
    </a>
  );

  if (!hasCategories) {
    const sorted = [...uncategorized].sort((a, b) => platformSortKey(a.platform) - platformSortKey(b.platform));
    return (
      <div className="flex flex-wrap gap-2">
        {sorted.map(renderLink)}
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {categoryLabels[category]}
            </div>
            <div className="flex flex-wrap gap-2">
              {sorted.map(renderLink)}
            </div>
          </div>
        );
      })}
      {hasUncategorized && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Other</div>
          <div className="flex flex-wrap gap-2">
            {uncategorized.map(renderLink)}
          </div>
        </div>
      )}
    </div>
  );
}