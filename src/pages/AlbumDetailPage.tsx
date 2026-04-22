import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import PlayerEmbed from "../components/PlayerEmbed";
import LinkButtons from "../components/LinkButtons";
import ViewToggle from "../components/ViewToggle";
import type { ViewMode } from "../components/ViewToggle";
import { ErrorState } from "../components/States";
import { getAlbum, getAlbumArtists, getSongArtists, listAlbumSongs, listLinks } from "../lib/db";
import type { Album, Link as LinkRow, Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

export default function AlbumDetailPage() {
  const { id } = useParams();
  const albumId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [artists, setArtists] = useState<Array<{ id: string; name: string; imageUrl?: string; imageFilePath?: string }>>([]);
  const [songs, setSongs] = useState<Array<{ song: Song; artists: Array<{ id: string; name: string }> }>>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [view, setView] = useState<ViewMode>("grid");

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
        const [rels, albumSongsList, albumLinks] = await Promise.all([
          getAlbumArtists(a.id),
          listAlbumSongs(a.id),
          listLinks({ type: "album", id: a.id }),
        ]);
        if (!mounted) return;
        setArtists(rels.map((r) => ({ id: r.artist.id, name: r.artist.name, imageUrl: r.artist.image_url ?? undefined, imageFilePath: r.artist.image_file_path ?? undefined })));
        const withArtists = await Promise.all(
          albumSongsList.map(async (sg) => {
            const sas = await getSongArtists(sg.id);
            return { song: sg, artists: sas.map((sa) => ({ id: sa.artist.id, name: sa.artist.name })) };
          })
        );
        setSongs(withArtists);
        setLinks(albumLinks);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load album.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [albumId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!album) return <ErrorState title="Not found" />;

  const cover = resolveImageSrc({ url: album.cover_url, filePath: album.cover_file_path, bucket: "album-covers" });
  const youtubeLink = links.find((l) => l.platform.toLowerCase().includes("youtube")) ?? null;

  return (
    <div>
      <Helmet>
        <title>{album.title} · ONL Music</title>
      </Helmet>

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        {cover && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2a] via-[#121212]/90 to-[#121212]" />
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[100px]" />
          </>
        )}
      </div>

      {/* Hero */}
      <div className="flex flex-col gap-5 pb-6 pt-4">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
          <div className="aspect-square w-40 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:w-56">
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">Album</div>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-[var(--text)] sm:text-5xl">{album.title}</h1>
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
            {album.release_year && (
              <div className="mt-2 text-xs text-dim">{album.release_year} · {songs.length} songs</div>
            )}
          </div>
        </div>
      </div>

      {youtubeLink && (
        <>
          <PlayerEmbed url={youtubeLink.url} />
          {youtubeLink.title && <div className="mt-2 text-sm text-dim">{youtubeLink.title}</div>}
        </>
      )}

      {/* Credits */}
      {artists.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Credits</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <Link
                key={a.id}
                to={`/artists/${a.id}`}
                className="flex items-center gap-3 rounded-md bg-panel p-3 transition hover:bg-panel2"
              >
                <div className="h-12 w-12 rounded-full bg-panel2 overflow-hidden shrink-0">
                  {a.imageUrl || a.imageFilePath ? (
                    <img
                      src={resolveImageSrc({ url: a.imageUrl, filePath: a.imageFilePath, bucket: "artist-images" })}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-lg font-bold text-muted">
                      {a.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[var(--accent)]">Artist</div>
                  <div className="font-medium text-[var(--text)] truncate">{a.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tracklist */}
      <section className="pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">Tracklist</h2>
          <ViewToggle mode={view} onChange={setView} />
        </div>
        {songs.length > 0 ? (
          view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {songs.map((item) => (
                <Link key={item.song.id} to={`/songs/${item.song.id}`} className="rounded-lg border border-app bg-panel p-3 transition hover:bg-panel2">
                  <img
                    src={resolveImageSrc({ url: item.song.cover_url, filePath: item.song.cover_file_path, bucket: "song-covers" })}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <div className="mt-2 truncate text-sm font-medium text-[var(--text)]">{item.song.title}</div>
                  <div className="text-xs text-dim">{item.artists.map((a) => a.name).join(", ") || item.song.duration || "—"}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-app text-xs uppercase text-dim">
                  <tr>
                    <th className="pb-2 font-medium w-12">#</th>
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium w-20 hidden sm:table-cell">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((item, i) => (
                    <tr key={item.song.id} className="border-b border-app hover:bg-panel2">
                      <td className="py-2 pr-4 text-dim">{i + 1}</td>
                      <td className="py-2">
                        <Link to={`/songs/${item.song.id}`} className="flex items-center gap-3 group">
                          <img
                            src={resolveImageSrc({ url: item.song.cover_url, filePath: item.song.cover_file_path, bucket: "song-covers" })}
                            alt=""
                            className="h-10 w-10 rounded shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-[var(--text)] group-hover:text-[var(--accent)]">{item.song.title}</span>
                            {item.artists.length > 0 && (
                              <span className="text-xs text-dim">{item.artists.map((a) => a.name).join(", ")}</span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="py-2 text-dim hidden sm:table-cell">{item.song.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-dim">No tracks yet.</div>
        )}
      </section>

      {/* Links */}
      {links.length > 0 && (
        <section className="pb-8">
          <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Links</h2>
          <LinkButtons links={links} />
        </section>
      )}
    </div>
  );
}