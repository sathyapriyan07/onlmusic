import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import PlayerEmbed from "../components/PlayerEmbed";
import AudioPreview from "../components/AudioPreview";
import LinkButtons from "../components/LinkButtons";
import MediaCard from "../components/MediaCard";
import { ErrorState } from "../components/States";
import { getAlbum, getSong, getSongArtists, listLinks, listSongs } from "../lib/db";
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
  const [albumSongs, setAlbumSongs] = useState<Song[]>([]);
  const [artistSongs, setArtistSongs] = useState<Song[]>([]);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 350);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

        // More from album
        if (s.album_id) {
          const allSongs = await listSongs();
          setAlbumSongs(allSongs.filter((sg) => sg.album_id === s.album_id && sg.id !== s.id && sg.published).slice(0, 5));
        }

        // More from first artist
        if (songArtists.length > 0) {
          const artistId = songArtists[0].artist.id;
          const allSongs = await listSongs();
          const withArtists = await Promise.all(
            allSongs.map(async (sg) => {
              const sas = await getSongArtists(sg.id);
              return { song: sg, artistIds: sas.map((sa) => sa.artist.id) };
            })
          );
          setArtistSongs(
            withArtists
              .filter((x) => x.artistIds.includes(artistId) && x.song.id !== s.id && x.song.published)
              .map((x) => x.song)
              .slice(0, 5)
          );
        }
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

  const albumCover = album
    ? resolveImageSrc({ url: album.cover_url, filePath: album.cover_file_path, bucket: "album-covers" })
    : cover;

  const artistsText = artists.map((a) => a.name).join(", ");

  return (
    <div>
      <Helmet>
        <title>{song.title} · ONL Music Discovery</title>
        <meta name="description" content={`${song.title}${artistsText ? ` by ${artistsText}` : ""}.`} />
      </Helmet>

      {/* Background blur */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {albumCover && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg)]" />
            <img
              src={albumCover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[80px]"
            />
          </>
        )}
      </div>

      {/* Sticky header */}
      <div
        className={`sticky top-0 z-50 mx-auto max-w-[14000px] transition-all duration-300 ${
          scrolled ? "bg-[var(--bg)]/95 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          {cover && <img src={cover} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{song.title}</div>
            <div className="truncate text-xs text-muted">{artistsText || "Unknown"}</div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col gap-6 pb-8 pt-20 sm:pt-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="aspect-square w-full shrink-0 overflow-hidden rounded-xl shadow-card sm:w-64">
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>

          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Song</div>
            <h1 className="mt-1 truncate text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {song.title}
            </h1>
            {artists.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 text-base text-muted">
                {artists.map((a, i) => (
                  <Link key={a.id} to={`/artists/${a.id}`} className="hover:text-white">
                    {a.name}
                    {i < artists.length - 1 ? ", " : ""}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              {song.year && <span className="rounded-full bg-white/10 px-3 py-1">{song.year}</span>}
              {song.duration && <span className="rounded-full bg-white/10 px-3 py-1">{song.duration}</span>}
              {album && (
                <Link to={`/albums/${album.id}`} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
                  {album.title}
                </Link>
              )}
            </div>
          </div>
        </div>

        {youtube && <PlayerEmbed url={youtube} />}
        {song.preview_url && <div className="max-w-md"><AudioPreview src={song.preview_url} /></div>}
      </div>

      {/* Content */}
      <div className="grid gap-6 pb-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* Credits */}
          {artists.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Credits</div>
              <div className="space-y-4">
                {artists.map((a) => (
                  <div key={`${a.id}-${a.role}`} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                    <div>
                      <div className="text-xs text-[var(--accent)]">{a.role}</div>
                      <Link to={`/artists/${a.id}`} className="mt-0.5 block text-base font-medium text-white hover:text-white/90">
                        {a.name}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* More from album */}
          {albumSongs.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                More from {album?.title}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {albumSongs.map((s) => (
                  <MediaCard
                    key={s.id}
                    to={`/songs/${s.id}`}
                    image={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                    title={s.title}
                    subtitle={s.duration ?? undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* More from artist */}
          {artistSongs.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                More from {artists[0]?.name}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {artistSongs.map((s) => (
                  <MediaCard
                    key={s.id}
                    to={`/songs/${s.id}`}
                    image={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                    title={s.title}
                    subtitle={s.duration ?? undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-black/40 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Links</div>
            <div className="mt-3">{links.length ? <LinkButtons links={links} /> : <div className="text-sm text-muted">No links.</div>}</div>
          </div>
        </div>
      </div>
    </div>
  );
}