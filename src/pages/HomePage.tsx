import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import HeroBanner from "../components/HeroBanner";
import HorizontalRow from "../components/HorizontalRow";
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
        if (mounted) setLoading(false);
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

  // Get hero data from first section
  const heroData = resolved[0]?.itemsResolved[0];
  const heroImage = heroData 
    ? resolveImageSrc({ 
        url: (heroData as Song).cover_url || (heroData as Album).cover_url, 
        filePath: (heroData as Song).cover_file_path || (heroData as Album).cover_file_path, 
        bucket: "song-covers" 
      })
    : undefined;

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

  return (
    <div>
      <Helmet>
        <title>ONL Music Discovery</title>
        <meta name="description" content="Discover music like never before" />
      </Helmet>

      {/* Hero Banner */}
      {heroData && (
        <HeroBanner
          title={(heroData as Song).title || (heroData as Album).title || (heroData as Artist).name}
          subtitle={(heroData as Artist).name}
          image={heroImage}
        />
      )}

      {/* Sections */}
      {resolved.length > 0 ? (
        resolved.map((section) => (
          <HorizontalRow
            key={section.id}
            title={section.title}
            items={section.itemsResolved.map((item) => ({
              id: item.id,
              to: section.type === "songs" ? `/songs/${item.id}` : section.type === "albums" ? `/albums/${item.id}` : `/artists/${item.id}`,
              image: resolveImageSrc({
                url: (item as Song).cover_url || (item as Album).cover_url || (item as Artist).image_url,
                filePath: (item as Song).cover_file_path || (item as Album).cover_file_path || (item as Artist).image_file_path,
                bucket: section.type === "songs" ? "song-covers" : section.type === "albums" ? "album-covers" : "artist-images",
              }),
              title: (item as Song).title || (item as Album).title || (item as Artist).name,
              subtitle: (item as Song).year ? String((item as Song).year) : (item as Album).release_year ? String((item as Album).release_year) : undefined,
            }))}
            variant={section.type === "artists" ? "round" : "square"}
          />
        ))
      ) : (
        <EmptyState
          title="No content yet"
          message="Admin can add homepage sections to display featured content."
        />
      )}

      {/* Quick Picks - Fallback sections */}
      {Object.keys(songsById).length > 0 && resolved.length === 0 && (
        <>
          <HorizontalRow
            title="Trending Now"
            subtitle="Popular this week"
            items={Object.values(songsById).slice(0, 10).map((s) => ({
              id: s.id,
              to: `/songs/${s.id}`,
              image: resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" }),
              title: s.title,
              subtitle: s.year ? String(s.year) : undefined,
            }))}
          />
          
          <HorizontalRow
            title="Recent Albums"
            subtitle="New releases"
            items={Object.values(albumsById).slice(0, 10).map((a) => ({
              id: a.id,
              to: `/albums/${a.id}`,
              image: resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" }),
              title: a.title,
              subtitle: a.release_year ? String(a.release_year) : undefined,
            }))}
          />

          <HorizontalRow
            title="Popular Artists"
            subtitle="Top artists"
            items={Object.values(artistsById).slice(0, 10).map((a) => ({
              id: a.id,
              to: `/artists/${a.id}`,
              image: resolveImageSrc({ url: a.image_url, filePath: a.image_file_path, bucket: "artist-images" }),
              title: a.name,
              subtitle: undefined,
            }))}
            variant="round"
          />
        </>
      )}
    </div>
  );
}