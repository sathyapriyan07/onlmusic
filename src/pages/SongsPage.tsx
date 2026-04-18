import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import SearchBar from "../components/SearchBar";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { getSongArtists, listSongs } from "../lib/db";
import type { Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

type SongWithSubtitle = Song & { subtitle?: string };

export default function SongsPage() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>("");
  const [rights, setRights] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongWithSubtitle[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const list = await listSongs({
          q: q.trim() || undefined,
          year: year ? Number(year) : undefined,
          rights: rights.trim() || undefined,
          published: true,
        });

        // Build subtitles (artists) with small N+1; acceptable for discovery scale.
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
  }, [q, year, rights]);

  const years = useMemo(() => {
    const set = new Set<number>();
    songs.forEach((s) => {
      if (s.year) set.add(s.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [songs]);

  return (
    <div>
      <Helmet>
        <title>Songs · ONL Music Discovery</title>
      </Helmet>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Songs</h1>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
          <SearchBar value={q} onChange={setQ} placeholder="Search songs…" />
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-full border border-app bg-panel px-4 py-3 text-sm text-white shadow-card outline-none"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          <input
            value={rights}
            onChange={(e) => setRights(e.target.value)}
            placeholder="Filter rights…"
            className="rounded-full border border-app bg-panel px-4 py-3 text-sm text-white shadow-card outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : err ? (
        <div className="mt-6">
          <ErrorState title="Could not load songs" message={err} />
        </div>
      ) : songs.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No songs found" message="Try adjusting your search or filters." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
