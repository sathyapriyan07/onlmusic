import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function SectionHeader({
  title,
  moreHref,
  moreLabel = "More",
}: {
  title: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {moreHref && (
        <Link
          to={moreHref}
          className="section-link"
        >
          {moreLabel}
        </Link>
      )}
    </div>
  );
}

export function SectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 rounded shimmer" />
      <div className="media-scroll">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-44 shrink-0">
            <div className="aspect-square rounded-lg shimmer" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-3/4 rounded shimmer" />
              <div className="h-3 w-1/2 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MediaRow({ children }: { children: ReactNode }) {
  return <div className="media-scroll">{children}</div>;
}