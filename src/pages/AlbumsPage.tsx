import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { SectionHeader } from "../components/MediaRow";
import { ErrorState, EmptyState } from "../components/States";
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
        <div className="sm:hidden">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 shimmer rounded-lg" />
            ))}
          </div>
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : albums.length === 0 ? (
        <EmptyState title="No albums" />
      ) : (
        <>
          <div className="hidden sm:block">
            <div className="media-scroll">
              {albums.map((a) => (
                <MediaCard
                  key={a.id}
                  to={`/albums/${a.id}`}
                  image={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
                  title={a.title}
                  subtitle={a.release_year ? String(a.release_year) : undefined}
                  variant="album"
                  size="medium"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:hidden">
            {albums.map((a) => (
              <MediaCard
                key={a.id}
                to={`/albums/${a.id}`}
                image={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
                title={a.title}
                subtitle={a.release_year ? String(a.release_year) : undefined}
                variant="album"
                size="small"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}