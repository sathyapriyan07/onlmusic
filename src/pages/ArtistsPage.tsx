import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { listArtists } from "../lib/db";
import type { Artist } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function ArtistsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const list = await listArtists({ published: true });
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
  }, []);

  return (
    <div>
      <Helmet>
        <title>Artists · ONL Music</title>
      </Helmet>

      <h1 className="mb-6 text-2xl font-bold text-white">Artists</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : artists.length === 0 ? (
        <EmptyState title="No artists" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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