import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import PlayerEmbed from "../components/PlayerEmbed";
import AudioPreview from "../components/AudioPreview";
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

      <div className="rounded-xl bg-panel p-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="aspect-square overflow-hidden rounded-lg bg-black/30">
            {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Song</div>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {song.title}
            </h1>
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

            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
              {song.year ? <span className="rounded-full bg-black/30 px-3 py-1">{song.year}</span> : null}
              {song.duration ? <span className="rounded-full bg-black/30 px-3 py-1">{song.duration}</span> : null}
              {song.music_rights ? <span className="rounded-full bg-black/30 px-3 py-1">{song.music_rights}</span> : null}
              {album ? (
                <span className="rounded-full bg-black/30 px-3 py-1">
                  <Link to={`/albums/${album.id}`} className="text-white hover:text-white/90">
                    {album.title}
                  </Link>
                  {album.release_year ? <span className="text-muted"> · {album.release_year}</span> : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {youtube ? (
            <div className="rounded-xl bg-panel p-5">
              <div className="mb-2 text-sm font-semibold text-white">YouTube</div>
              <PlayerEmbed url={youtube} />
            </div>
          ) : null}

          {song.preview_url ? (
            <div className="rounded-xl bg-panel p-5">
              <div className="mb-2 text-sm font-semibold text-white">Preview</div>
              <AudioPreview src={song.preview_url} />
            </div>
          ) : null}

          {artists.length ? (
            <div className="rounded-xl bg-panel p-5">
              <div className="text-sm font-semibold text-white">Credits</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {artists.map((a) => (
                  <div key={`${a.id}-${a.role}`} className="rounded-lg bg-panel2 p-3 text-sm">
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

        <div className="rounded-xl bg-panel p-5">
          <div className="text-sm font-semibold text-white">External links</div>
          <div className="mt-3">
            {links.length ? <LinkButtons links={links} /> : <div className="text-sm text-muted">No links yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
