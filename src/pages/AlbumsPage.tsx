import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { listAlbums } from "../lib/db";
import type { Album } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function AlbumsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);

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

      <h1 className="mb-6 text-2xl font-bold text-[var(--text)]">Albums</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : albums.length === 0 ? (
        <EmptyState title="No albums" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
      )}
    </div>
  );
}