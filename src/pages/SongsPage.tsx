import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MediaCard from "../components/MediaCard";
import ViewToggle from "../components/ViewToggle";
import type { ViewMode } from "../components/ViewToggle";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { getSongArtists, listSongs } from "../lib/db";
import type { Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

type SongWithSubtitle = Song & { subtitle?: string };

export default function SongsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongWithSubtitle[]>([]);
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const list = await listSongs({ published: true });
        const enriched = await Promise.all(
          list.map(async (s) => {
            const rel = await getSongArtists(s.id);
            const names = rel.map((r) => r.artist.name);
            return { ...s, subtitle: names.slice(0, 2).join(", ") };
          }),
        );
        if (!mounted) return;
        setSongs(enriched);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load songs.");
      } finally {
        if (mounted) setLoading(false);
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
        <title>Songs · ONL Music</title>
      </Helmet>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Songs</h1>
        <ViewToggle mode={view} onChange={setView} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : songs.length === 0 ? (
        <EmptyState title="No songs found" message="Try a different search." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {songs.map((s) => (
            <MediaCard
              key={s.id}
              to={`/songs/${s.id}`}
              image={resolveImageSrc({
                url: s.cover_url,
                filePath: s.cover_file_path,
                bucket: "song-covers",
              })}
              title={s.title}
              subtitle={s.subtitle}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((s) => (
            <Link
              key={s.id}
              to={`/songs/${s.id}`}
              className="flex items-center gap-4 rounded-lg border border-app bg-panel p-3 transition hover:bg-panel2"
            >
              <img
                src={resolveImageSrc({
                  url: s.cover_url,
                  filePath: s.cover_file_path,
                  bucket: "song-covers",
                })}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--text)]">{s.title}</div>
                <div className="text-xs text-[var(--muted)]">{s.subtitle}</div>
              </div>
              <div className="text-xs text-[var(--muted)]">{s.year}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}