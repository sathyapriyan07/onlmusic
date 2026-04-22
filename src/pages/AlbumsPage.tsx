import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MediaCard from "../components/MediaCard";
import ViewToggle from "../components/ViewToggle";
import type { ViewMode } from "../components/ViewToggle";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { listAlbums } from "../lib/db";
import type { Album } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function AlbumsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const data = await listAlbums({ published: true });
        if (!mounted) return;
        setAlbums(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load albums.");
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <Helmet>
        <title>Albums · ONL Music</title>
      </Helmet>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Albums</h1>
        <ViewToggle mode={view} onChange={setView} />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : albums.length === 0 ? (
        <EmptyState title="No albums" />
      ) : view === "grid" ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((a) => (
            <MediaCard
              key={a.id}
              to={`/albums/${a.id}`}
              image={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
              title={a.title}
              subtitle={a.release_year ? String(a.release_year) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {albums.map((a) => (
            <Link
              key={a.id}
              to={`/albums/${a.id}`}
              className="flex items-center gap-4 rounded-lg border border-app bg-panel p-3 transition hover:bg-panel2"
            >
              <img
                src={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--text)]">{a.title}</div>
                <div className="text-xs text-[var(--muted)]">{a.release_year}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}