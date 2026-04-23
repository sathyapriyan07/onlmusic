import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { SectionHeader } from "../components/MediaRow";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonRow } from "../components/Skeletons";
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

      <SectionHeader title="Songs" />

      {loading ? (
        <div className="sm:hidden">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} variant="song" count={3} />
            ))}
          </div>
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : songs.length === 0 ? (
        <EmptyState title="No songs found" message="Try a different search." />
      ) : (
        <>
          <div className="hidden sm:block">
            <div className="media-scroll">
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
                  variant="song"
                  size="medium"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:hidden">
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
                variant="song"
                size="small"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}