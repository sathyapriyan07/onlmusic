import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { SectionHeader } from "../components/MediaRow";
import { ErrorState, EmptyState } from "../components/States";
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
        <title>Artists · ONL Music</title>
      </Helmet>

      <SectionHeader title="Artists" />

      {loading ? (
        <div className="sm:hidden">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-full shimmer" />
            ))}
          </div>
        </div>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : artists.length === 0 ? (
        <EmptyState title="No artists" />
      ) : (
        <>
          <div className="hidden sm:block">
            <div className="media-scroll">
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
                  variant="artist"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:hidden">
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
                variant="artist"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}