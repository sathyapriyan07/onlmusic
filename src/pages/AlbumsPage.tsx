import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { SectionHeader, MediaRow } from "../components/MediaRow";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonAlbumCard } from "../components/Skeletons";
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
        <title>Albums · ONL Music</title>
      </Helmet>

      <SectionHeader title="Albums" />

      {loading ? (
        <MediaRow>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonAlbumCard key={i} />
          ))}
        </MediaRow>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : albums.length === 0 ? (
        <EmptyState title="No albums" />
      ) : (
        <MediaRow>
          {albums.map((a) => (
            <MediaCard
              key={a.id}
              to={`/albums/${a.id}`}
              image={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
              title={a.title}
              subtitle={a.release_year ? String(a.release_year) : undefined}
              variant="album"
            />
          ))}
        </MediaRow>
      )}
    </div>
  );
}