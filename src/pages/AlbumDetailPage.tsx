import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import LinkButtons from "../components/LinkButtons";
import { ErrorState } from "../components/States";
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
            <div className="text-xs font-medium uppercase tracking-wider text-white/70">Album</div>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-white sm:text-5xl">{album.title}</h1>
            {artists.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-sm text-white/70 sm:justify-start">
                {artists.map((a, i) => (
                  <Link key={a.id} to={`/artists/${a.id}`} className="hover:text-white hover:underline">
                    {a.name}
                    {i < artists.length - 1 ? ", " : ""}
                  </Link>
                ))}
              </div>
            )}
            {album.release_year && (
              <div className="mt-2 text-xs text-white/50">{album.release_year} · {songs.length} songs</div>
            )}
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <section className="pb-8">
        <h2 className="mb-4 text-lg font-bold text-white">Tracklist</h2>
        {songs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-white/50">
                <tr>
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Duration</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((s, i) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-4 text-white/50">{i + 1}</td>
                    <td className="py-2">
                      <Link to={`/songs/${s.id}`} className="flex items-center gap-3 group">
                        <img
                          src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                          alt=""
                          className="h-10 w-10 rounded shrink-0"
                        />
                        <span className="font-medium text-white group-hover:text-[var(--accent)]">{s.title}</span>
                      </Link>
                    </td>
                    <td className="py-2 text-white/50 hidden sm:table-cell">{s.duration || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-white/50">No tracks yet.</div>
        )}
      </section>

      {/* Links */}
      {links.length > 0 && (
        <section className="pb-8">
          <h2 className="mb-4 text-lg font-bold text-white">Links</h2>
          <LinkButtons links={links} />
        </section>
      )}
    </div>
  );
}