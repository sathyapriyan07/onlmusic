import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import SearchBar from "../components/SearchBar";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { listAlbums } from "../lib/db";
import type { Album } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function AlbumsPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const list = await listAlbums({ q: q.trim() || undefined });
        if (!mounted) return;
        setAlbums(list);
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
  }, [q]);

  return (
    <div>
      <Helmet>
        <title>Albums · ONL Music Discovery</title>
      </Helmet>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Albums</h1>
        <div className="w-full sm:w-96">
          <SearchBar value={q} onChange={setQ} placeholder="Search albums…" />
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
          <ErrorState title="Could not load albums" message={err} />
        </div>
      ) : albums.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No albums found" message="Try a different search." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {albums.map((a) => (
            <MediaCard
              key={a.id}
              to={`/albums/${a.id}`}
              image={resolveImageSrc({
                url: a.cover_url,
                filePath: a.cover_file_path,
                bucket: "album-covers",
              })}
              title={a.title}
              subtitle={a.release_year ? String(a.release_year) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
