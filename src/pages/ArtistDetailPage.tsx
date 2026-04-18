import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import LinkButtons from "../components/LinkButtons";
import MediaCard from "../components/MediaCard";
import { ErrorState } from "../components/States";
import { getArtist, listArtistAlbums, listArtistSongs, listLinks } from "../lib/db";
import type { Album, Artist, Link as LinkRow, Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function ArtistDetailPage() {
  const { id } = useParams();
  const artistId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Array<{ song: Song; role: string }>>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const a = await getArtist(artistId);
        if (!mounted) return;
        setArtist(a);
        if (!a) {
          setErr("Artist not found.");
          return;
        }
        const [songRels, albumRels, artistLinks] = await Promise.all([
          listArtistSongs(a.id),
          listArtistAlbums(a.id),
          listLinks({ type: "artist", id: a.id }),
        ]);
        if (!mounted) return;
        setSongs(songRels.map((r) => ({ song: r.song, role: r.role })));
        setAlbums(albumRels.map((r) => r.album));
        setLinks(artistLinks);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load artist.");
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [artistId]);

  const image = useMemo(() => {
    if (!artist) return "";
    return resolveImageSrc({
      url: artist.image_url,
      filePath: artist.image_file_path,
      bucket: "artist-images",
    });
  }, [artist]);

  if (loading) return null;
  if (err) return <ErrorState title="Could not load artist" message={err} />;
  if (!artist) return <ErrorState title="Artist not found" />;

  return (
    <div>
      <Helmet>
        <title>{artist.name} · ONL Music Discovery</title>
        <meta name="description" content={artist.bio ? artist.bio.slice(0, 160) : `Artist page for ${artist.name}.`} />
      </Helmet>

      <div className="relative overflow-hidden rounded-[32px] border border-app bg-white/5 p-6 shadow-card sm:p-7">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(191,90,242,0.18),rgba(191,90,242,0)_55%),radial-gradient(circle_at_80%_10%,rgba(255,55,95,0.12),rgba(255,55,95,0)_55%)]" />
          {image ? (
            <img
              src={image}
              alt=""
              className="absolute right-0 top-0 hidden h-full w-1/2 object-cover opacity-25 blur-2xl lg:block"
            />
          ) : null}
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="h-28 w-28 overflow-hidden rounded-full border border-app bg-black/20 ring-1 ring-white/10">
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{artist.name}</h1>
            {artist.bio ? <p className="mt-2 max-w-3xl text-sm text-muted">{artist.bio}</p> : null}
            <div className="mt-4">{links.length ? <LinkButtons links={links} /> : null}</div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section className="rounded-3xl border border-app bg-white/5 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-white">Songs</h2>
          {songs.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {songs.map((s) => (
                <MediaCard
                  key={`${s.song.id}-${s.role}`}
                  to={`/songs/${s.song.id}`}
                  image={resolveImageSrc({
                    url: s.song.cover_url,
                    filePath: s.song.cover_file_path,
                    bucket: "song-covers",
                  })}
                  title={s.song.title}
                  subtitle={s.role}
                />
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted">No songs yet.</div>
          )}
        </section>

        <section className="rounded-3xl border border-app bg-white/5 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-white">Albums</h2>
          {albums.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {albums.map((a) => (
                <MediaCard
                  key={a.id}
                  to={`/albums/${a.id}`}
                  image={resolveImageSrc({
                    url: a.cover_url,
                    filePath: a.cover_file_path,
                    bucket: "album-covers",
                  })}
                  title={a.title}
                  subtitle={a.release_year ? String(a.release_year) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted">No albums yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
