import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import LinkButtons from "../components/LinkButtons";
import { ErrorState } from "../components/States";
import MediaCard from "../components/MediaCard";
import { getAlbum, getAlbumArtists, listAlbumSongs, listLinks } from "../lib/db";
import type { Album, Link as LinkRow, Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function AlbumDetailPage() {
  const { id } = useParams();
  const albumId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [artists, setArtists] = useState<Array<{ id: string; name: string }>>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const a = await getAlbum(albumId);
        if (!mounted) return;
        setAlbum(a);
        if (!a) {
          setErr("Album not found.");
          return;
        }
        const [rels, albumSongs, albumLinks] = await Promise.all([
          getAlbumArtists(a.id),
          listAlbumSongs(a.id),
          listLinks({ type: "album", id: a.id }),
        ]);
        if (!mounted) return;
        setArtists(rels.map((r) => ({ id: r.artist.id, name: r.artist.name })));
        setSongs(albumSongs);
        setLinks(albumLinks);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load album.");
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [albumId]);

  const artistsText = useMemo(() => artists.map((a) => a.name).join(", "), [artists]);

  if (loading) return null;
  if (err) return <ErrorState title="Could not load album" message={err} />;
  if (!album) return <ErrorState title="Album not found" />;

  const cover = resolveImageSrc({
    url: album.cover_url,
    filePath: album.cover_file_path,
    bucket: "album-covers",
  });

  return (
    <div>
      <Helmet>
        <title>{album.title} · ONL Music Discovery</title>
        <meta name="description" content={`Album details for ${album.title}${artistsText ? ` by ${artistsText}` : ""}.`} />
      </Helmet>

      <div className="rounded-xl bg-panel p-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="aspect-square overflow-hidden rounded-lg bg-black/30">
            {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Album</div>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {album.title}
            </h1>
            <div className="mt-2 text-sm text-muted">
              {artists.length ? (
                <span>
                  {artists.map((a, i) => (
                    <span key={a.id}>
                      <Link to={`/artists/${a.id}`} className="hover:text-white">
                        {a.name}
                      </Link>
                      {i < artists.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              ) : null}
              {album.release_year ? <span>{artists.length ? " · " : ""}{album.release_year}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl bg-panel p-5">
          <div className="text-sm font-semibold text-white">Tracklist</div>
          {songs.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {songs.map((s) => (
                <MediaCard
                  key={s.id}
                  to={`/songs/${s.id}`}
                  image={resolveImageSrc({
                    url: s.cover_url,
                    filePath: s.cover_file_path,
                    bucket: "song-covers",
                  })}
                  title={s.title}
                  subtitle={[s.duration ?? "", s.year ? String(s.year) : ""].filter(Boolean).join(" · ")}
                />
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted">No songs yet.</div>
          )}
        </div>

        <div className="rounded-xl bg-panel p-5">
          <div className="text-sm font-semibold text-white">External links</div>
          <div className="mt-3">{links.length ? <LinkButtons links={links} /> : <div className="text-sm text-muted">No links yet.</div>}</div>
        </div>
      </div>
    </div>
  );
}
