import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import PlayerEmbed from "../components/PlayerEmbed";
import LinkButtons from "../components/LinkButtons";
import { ErrorState } from "../components/States";
import { getAlbum, getSong, getSongArtists, listLinks } from "../lib/db";
import type { Album, Link as LinkRow, Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function SongDetailPage() {
  const { id } = useParams();
  const songId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [artists, setArtists] = useState<Array<{ role: string; id: string; name: string }>>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const s = await getSong(songId);
        if (!mounted) return;
        setSong(s);
        if (!s) {
          setErr("Song not found.");
          return;
        }

        const [songArtists, songLinks, albumRow] = await Promise.all([
          getSongArtists(s.id),
          listLinks({ type: "song", id: s.id }),
          s.album_id ? getAlbum(s.album_id) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setArtists(songArtists.map((sa) => ({ role: sa.role, id: sa.artist.id, name: sa.artist.name })));
        setLinks(songLinks);
        setAlbum(albumRow);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load song.");
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [songId]);

  const youtube = useMemo(() => links.find((l) => l.platform.toLowerCase().includes("youtube"))?.url, [links]);

  if (loading) return null;
  if (err) return <ErrorState title="Could not load song" message={err} />;
  if (!song) return <ErrorState title="Song not found" />;

  const cover = resolveImageSrc({
    url: song.cover_url,
    filePath: song.cover_file_path,
    bucket: "song-covers",
  });

  const artistsText = artists.map((a) => a.name).join(", ");

  return (
    <div>
      <Helmet>
        <title>{song.title} · ONL Music Discovery</title>
        <meta name="description" content={`Song details for ${song.title}${artistsText ? ` by ${artistsText}` : ""}.`} />
      </Helmet>

      <div className="relative overflow-hidden rounded-[32px] border border-app bg-white/5 shadow-card">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,55,95,0.20),rgba(255,55,95,0)_55%),radial-gradient(circle_at_80%_10%,rgba(10,132,255,0.14),rgba(10,132,255,0)_55%)]" />
          {cover ? (
            <img
              src={cover}
              alt=""
              className="absolute right-0 top-0 hidden h-full w-1/2 object-cover opacity-25 blur-2xl lg:block"
            />
          ) : null}
        </div>

        <div className="relative grid gap-6 p-6 lg:grid-cols-[260px_1fr] lg:p-8">
          <div className="rounded-3xl border border-app bg-black/20 p-3 backdrop-blur">
            <div className="aspect-square overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
              {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="mt-4">
              <h1 className="text-2xl font-semibold tracking-tight text-white">{song.title}</h1>
              {artists.length ? (
                <div className="mt-2 text-sm text-muted">
                  {artists.map((a, i) => (
                    <span key={a.id}>
                      <Link to={`/artists/${a.id}`} className="hover:text-white">
                        {a.name}
                      </Link>
                      {i < artists.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-app bg-white/5 p-3">
              <dt className="text-xs text-muted">Year</dt>
              <dd className="mt-1 font-medium text-white">{song.year ?? "—"}</dd>
              </div>
              <div className="rounded-2xl border border-app bg-white/5 p-3">
              <dt className="text-xs text-muted">Duration</dt>
              <dd className="mt-1 font-medium text-white">{song.duration ?? "—"}</dd>
              </div>
              <div className="col-span-2 rounded-2xl border border-app bg-white/5 p-3">
              <dt className="text-xs text-muted">Rights</dt>
              <dd className="mt-1 font-medium text-white">{song.music_rights ?? "—"}</dd>
              </div>
              {album ? (
                <div className="col-span-2 rounded-2xl border border-app bg-white/5 p-3">
                  <dt className="text-xs text-muted">Album</dt>
                  <dd className="mt-1 font-medium text-white">
                    <Link to={`/albums/${album.id}`} className="hover:text-white">
                      {album.title}
                    </Link>
                    {album.release_year ? <span className="text-muted"> · {album.release_year}</span> : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="space-y-4">
            {youtube ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-white">YouTube</h2>
                <PlayerEmbed url={youtube} />
              </div>
            ) : null}

            <div className="rounded-3xl border border-app bg-white/5 p-6 shadow-card">
              <h2 className="text-sm font-semibold text-white">External links</h2>
              <div className="mt-3">
                {links.length ? <LinkButtons links={links} /> : <div className="text-sm text-muted">No links yet.</div>}
              </div>
            </div>

            {artists.length ? (
              <div className="rounded-3xl border border-app bg-white/5 p-6 shadow-card">
                <h2 className="text-sm font-semibold text-white">Credits</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {artists.map((a) => (
                    <div key={`${a.id}-${a.role}`} className="rounded-2xl border border-app bg-white/5 p-3 text-sm">
                      <div className="text-xs text-muted">{a.role}</div>
                      <Link to={`/artists/${a.id}`} className="mt-1 block font-medium text-white hover:text-white/90">
                        {a.name}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
