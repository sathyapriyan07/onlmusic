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

      <div className="rounded-xl bg-panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Home</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Discover songs, albums, and artists. This app stores metadata + official external links only (no streaming); YouTube links can be embedded on the song page.
        </p>
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
                    <div key={song.id} className="w-44 shrink-0">
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
                    <div key={album.id} className="w-44 shrink-0">
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
                    <div key={artist.id} className="w-44 shrink-0">
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
