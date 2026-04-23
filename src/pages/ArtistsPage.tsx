import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MediaCard from "../components/MediaCard";
import { SectionHeader, MediaRow } from "../components/MediaRow";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonArtistCard } from "../components/Skeletons";
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
        <MediaRow>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonArtistCard key={i} />
          ))}
        </MediaRow>
      ) : err ? (
        <ErrorState title="Error" message={err} />
      ) : artists.length === 0 ? (
        <EmptyState title="No artists" />
      ) : (
        <MediaRow>
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
              showPlayOnHover={false}
            />
          ))}
        </MediaRow>
      )}
    </div>
  );
}