import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import SectionRow from "../components/SectionRow";
import MediaCard from "../components/MediaCard";
import { ErrorState, EmptyState } from "../components/States";
import { SkeletonRow } from "../components/Skeletons";
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

        // Fetch in batches by type (by IDs). For simplicity, pull latest lists and map by id.
        // This keeps the frontend simple while remaining fast for small-to-medium catalogs.
        const [songs, albums, artists] = await Promise.all([
          listSongs(),
          listAlbums(),
          listArtists(),
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

  return (
    <div>
      <Helmet>
        <title>Home · ONL Music Discovery</title>
      </Helmet>

      <div className="relative overflow-hidden rounded-[32px] border border-app bg-white/5 p-6 shadow-card sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,55,95,0.28),rgba(255,55,95,0)_55%),radial-gradient(circle_at_70%_30%,rgba(10,132,255,0.18),rgba(10,132,255,0)_55%)]" />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Discovery</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Find something new to love
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Explore songs, albums, and artists — metadata + external links only. If a YouTube link exists, you’ll see an embedded player on the song page.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-8">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : err ? (
        <div className="mt-8">
          <ErrorState title="Could not load homepage" message={err} />
        </div>
      ) : resolved.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No sections yet"
            message="Admins can create homepage sections (Trending Songs, Popular Albums, Featured Artists) from the Admin dashboard."
          />
        </div>
      ) : (
        <div>
          {resolved.map((s) => (
            <SectionRow key={s.id} title={s.title}>
              {s.type === "songs"
                ? (s.itemsResolved as Song[]).map((song) => (
                    <div key={song.id} className="w-44 shrink-0 snap-start">
                      <MediaCard
                        to={`/songs/${song.id}`}
                        image={resolveImageSrc({
                          url: song.cover_url,
                          filePath: song.cover_file_path,
                          bucket: "song-covers",
                        })}
                        title={song.title}
                        subtitle={song.year ? String(song.year) : undefined}
                      />
                    </div>
                  ))
                : null}

              {s.type === "albums"
                ? (s.itemsResolved as Album[]).map((album) => (
                    <div key={album.id} className="w-44 shrink-0 snap-start">
                      <MediaCard
                        to={`/albums/${album.id}`}
                        image={resolveImageSrc({
                          url: album.cover_url,
                          filePath: album.cover_file_path,
                          bucket: "album-covers",
                        })}
                        title={album.title}
                        subtitle={album.release_year ? String(album.release_year) : undefined}
                      />
                    </div>
                  ))
                : null}

              {s.type === "artists"
                ? (s.itemsResolved as Artist[]).map((artist) => (
                    <div key={artist.id} className="w-44 shrink-0 snap-start">
                      <MediaCard
                        to={`/artists/${artist.id}`}
                        image={resolveImageSrc({
                          url: artist.image_url,
                          filePath: artist.image_file_path,
                          bucket: "artist-images",
                        })}
                        title={artist.name}
                        variant="round"
                      />
                    </div>
                  ))
                : null}
            </SectionRow>
          ))}
        </div>
      )}
    </div>
  );
}
