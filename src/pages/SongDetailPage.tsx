import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import PlayerEmbed from "../components/PlayerEmbed";
import AudioPreview from "../components/AudioPreview";
import LinkButtons from "../components/LinkButtons";
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
  const [artists, setArtists] = useState<Array<{ role: string; id: string; name: string; imageUrl: string | null; imageFilePath: string | null }>>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [albumSongs, setAlbumSongs] = useState<Song[]>([]);
  const [artistSongs, setArtistSongs] = useState<Song[]>([]);

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
        setArtists(songArtists.map((sa) => ({ 
          role: sa.role, 
          id: sa.artist.id, 
          name: sa.artist.name,
          imageUrl: sa.artist.image_url,
          imageFilePath: sa.artist.image_file_path,
        })));
        setLinks(songLinks);
        setAlbum(albumRow);

        if (s.album_id) {
          const allSongs = await listSongs();
          setAlbumSongs(allSongs.filter((sg) => sg.album_id === s.album_id && sg.id !== s.id && sg.published).slice(0, 10));
        }

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
              .slice(0, 6)
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

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!song) return <ErrorState title="Not found" />;

  const cover = resolveImageSrc({ url: song.cover_url, filePath: song.cover_file_path, bucket: "song-covers" });
  const albumCover = album ? resolveImageSrc({ url: album.cover_url, filePath: album.cover_file_path, bucket: "album-covers" }) : cover;

  return (
    <div>
      <Helmet>
        <title>{song.title} · ONL Music</title>
      </Helmet>

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        {albumCover && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2a] via-[#121212]/90 to-[#121212]" />
            <img src={albumCover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[100px]" />
          </>
        )}
      </div>

      {/* Hero - Mobile: centered, smaller cover */}
      <div className="flex flex-col gap-6 pb-8 pt-4">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
          <div className="aspect-square w-48 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:w-56">
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">Song</div>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-[var(--text)] sm:text-5xl sm:text-left">{song.title}</h1>
            {artists.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted sm:justify-start">
                {artists.map((a, i) => (
                  <Link key={a.id} to={`/artists/${a.id}`} className="hover:text-[var(--text)] hover:underline">
                    {a.name}
                    {i < artists.length - 1 ? ", " : ""}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-dim sm:justify-start">
              {song.year && <span>{song.year}</span>}
              {song.year && song.duration && <span>·</span>}
              {song.duration && <span>{song.duration}</span>}
              {album && <span>· {album.title}</span>}
            </div>
          </div>
        </div>
        {youtube && <PlayerEmbed url={youtube} />}
        {song.preview_url && <div className="max-w-md mx-auto sm:mx-0"><AudioPreview src={song.preview_url} /></div>}
      </div>

      {/* Sections */}
      <div className="space-y-8 pb-8">
        {/* Credits */}
        {artists.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Credits</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((a) => (
                <Link
                  key={`${a.id}-${a.role}`}
                  to={`/artists/${a.id}`}
                  className="flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-white/10"
                >
                  <img
                    src={resolveImageSrc({ url: a.imageUrl ?? undefined, filePath: a.imageFilePath ?? undefined, bucket: "artist-images" })}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="text-xs text-[var(--accent)]">{a.role}</div>
                    <div className="font-medium text-[var(--text)]">{a.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* More from album - Table like Spotify */}
        {albumSongs.length > 0 && (
          <section>
            <Link to={album ? `/albums/${album.id}` : "#"} className="mb-4 block text-lg font-bold text-[var(--text)] hover:underline">
              More from {album?.title}
            </Link>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-dim">
                  <tr>
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {albumSongs.map((s, i) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-4 text-dim">{i + 1}</td>
                      <td className="py-2">
                        <Link to={`/songs/${s.id}`} className="flex items-center gap-3 group">
                          <img
                            src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                            alt=""
                            className="h-10 w-10 rounded shrink-0"
                          />
                          <span className="font-medium text-[var(--text)] group-hover:text-[var(--accent)]">{s.title}</span>
                        </Link>
                      </td>
                      <td className="py-2 text-dim hidden sm:table-cell">{s.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* More from artist */}
        {artistSongs.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-[var(--text)]">More by {artists[0]?.name}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {artistSongs.map((s) => (
                <Link
                  key={s.id}
                  to={`/songs/${s.id}`}
                  className="group rounded-lg bg-transparent p-2 transition hover:bg-white/5"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-black/40">
                    <img
                      src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-2">
                    <div className="line-clamp-1 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">{s.title}</div>
                    {s.duration && <div className="text-xs text-dim">{s.duration}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        {links.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Links</h2>
            <LinkButtons links={links} />
          </section>
        )}
      </div>
    </div>
  );
}