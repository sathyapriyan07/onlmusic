import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import SearchBar from "../components/SearchBar";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { listArtists } from "../lib/db";
import type { Artist } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function ArtistsPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const list = await listArtists({ q: q.trim() || undefined });
        if (!mounted) return;
        setArtists(list);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load artists.");
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
        <title>Artists · ONL Music Discovery</title>
      </Helmet>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Artists</h1>
        <div className="w-full sm:w-96">
          <SearchBar value={q} onChange={setQ} placeholder="Search artists…" />
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
          <ErrorState title="Could not load artists" message={err} />
        </div>
      ) : artists.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No artists found" message="Try a different search." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {artists.map((a) => (
            <MediaCard
              key={a.id}
              to={`/artists/${a.id}`}
              image={resolveImageSrc({
                url: a.image_url,
                filePath: a.image_file_path,
                bucket: "artist-images",
              })}
              title={a.name}
              variant="round"
            />
          ))}
        </div>
      )}
    </div>
  );
}
