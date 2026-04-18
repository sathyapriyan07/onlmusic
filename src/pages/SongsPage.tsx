import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
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
        setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  });

  return (
    <div>
      <Helmet>
        <title>Songs · ONL Music</title>
      </Helmet>

      <h1 className="mb-6 text-2xl font-bold text-white">Songs</h1>

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
      ) : (
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
      )}
    </div>
  );
}