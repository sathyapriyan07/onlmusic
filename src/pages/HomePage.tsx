import { useEffect, useMemo, useState } from "react";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonCard } from "../components/Skeletons";
import { listHomepageSections, listSongs, listAlbums, listArtists } from "../lib/db";
import type { Album, Artist, HomepageSection, Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [songsById, setSongsById] = useState<Record<string, Song>>({});
  const [albumsById, setAlbumsById] = useState<Record<string, Album>>({});
  const [artistsById, setArtistsById] = useState<Record<string, Artist>>({});

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const secs = await listHomepageSections();
        if (!mounted) return;
        setSections(secs);

        const [songs, albums, artists] = await Promise.all([
          listSongs({ published: true }),
          listAlbums({ published: true }),
          listArtists({ published: true }),
        ]);
        if (!mounted) return;
        setSongsById(Object.fromEntries(songs.map((s) => [s.id, s])));
        setAlbumsById(Object.fromEntries(albums.map((a) => [a.id, a])));
        setArtistsById(Object.fromEntries(artists.map((a) => [a.id, a])));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load homepage.");
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const resolved = useMemo(() => {
    return sections.map((s) => {
      if (s.type === "songs") return { ...s, itemsResolved: s.items.map((id) => songsById[id]).filter(Boolean) };
      if (s.type === "albums") return { ...s, itemsResolved: s.items.map((id) => albumsById[id]).filter(Boolean) };
      return { ...s, itemsResolved: s.items.map((id) => artistsById[id]).filter(Boolean) };
    });
  }, [sections, songsById, albumsById, artistsById]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (err) return <ErrorState title="Error" message={err} />;
  if (resolved.length === 0) {
    return (
      <EmptyState
        title="No content yet"
        message="Admin can add homepage sections to display featured content."
      />
    );
  }

  return (
    <div className="space-y-8">
      {resolved.map((section) => (
        <section key={section.id}>
          <h2 className="mb-4 text-xl font-bold text-[var(--text)]">{section.title}</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {section.itemsResolved.map((item) => {
              const isSong = section.type === "songs";
              const isAlbum = section.type === "albums";
              return (
                <div key={item.id} className="w-40 shrink-0 sm:w-44">
                  <MediaCard
                    to={isSong ? `/songs/${item.id}` : isAlbum ? `/albums/${item.id}` : `/artists/${item.id}`}
                    image={resolveImageSrc({
                      url: isSong ? (item as Song).cover_url : isAlbum ? (item as Album).cover_url : (item as Artist).image_url,
                      filePath: isSong
                        ? (item as Song).cover_file_path
                        : isAlbum
                          ? (item as Album).cover_file_path
                          : (item as Artist).image_file_path,
                      bucket: isSong ? "song-covers" : isAlbum ? "album-covers" : "artist-images",
                    })}
                    title={isSong ? (item as Song).title : isAlbum ? (item as Album).title : (item as Artist).name}
                    subtitle={
                      isSong
                        ? (item as Song).year
                          ? String((item as Song).year)
                          : undefined
                        : isAlbum
                          ? (item as Album).release_year
                            ? String((item as Album).release_year)
                            : undefined
                          : undefined
                    }
                    variant={section.type === "artists" ? "round" : "square"}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Fallback: Recent if no sections */}
      {resolved.length === 0 && (
        <>
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--text)]">Recently Added</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Object.values(songsById)
                .slice(0, 5)
                .map((s) => (
                  <MediaCard
                    key={s.id}
                    to={`/songs/${s.id}`}
                    image={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                    title={s.title}
                    subtitle={s.year ? String(s.year) : undefined}
                  />
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}