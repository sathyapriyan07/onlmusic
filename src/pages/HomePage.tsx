import { useEffect, useMemo, useState } from "react";
import MediaCard from "../components/MediaCard";
import { SectionHeader, MediaRow, SectionSkeleton } from "../components/MediaRow";
import { ErrorState, EmptyState } from "../components/States";
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
      <div className="space-y-8">
        <SectionSkeleton count={8} />
        <SectionSkeleton count={6} />
        <SectionSkeleton count={7} />
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
    <div className="space-y-8 sm:space-y-10">
      {resolved.map((section) => (
        <section key={section.id}>
          <SectionHeader title={section.title} />
          <div className="hidden sm:block">
            <MediaRow>
              {section.itemsResolved.map((item) => {
                const isSong = section.type === "songs";
                const isAlbum = section.type === "albums";
                const variant = isSong ? "song" : isAlbum ? "album" : "artist";
                return (
                  <MediaCard
                    key={item.id}
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
                    variant={variant}
                  />
                );
              })}
            </MediaRow>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:hidden">
            {section.itemsResolved.map((item) => {
              const isSong = section.type === "songs";
              const isAlbum = section.type === "albums";
              const variant = isSong ? "song" : isAlbum ? "album" : "artist";
              return (
                <MediaCard
                  key={item.id}
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
                  variant={variant}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}