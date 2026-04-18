import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
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

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!artist) return <ErrorState title="Not found" />;

  return (
    <div>
      <Helmet>
        <title>{artist.name} · ONL Music</title>
      </Helmet>

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        {image && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2a] via-[#121212]/90 to-[#121212]" />
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[100px]" />
          </>
        )}
      </div>

      {/* Hero */}
      <div className="flex flex-col gap-5 pb-6 pt-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-full shadow-2xl sm:h-56 sm:w-56">
            <img src={image} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium uppercase tracking-wider text-white/70">Artist</div>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-white sm:text-5xl">{artist.name}</h1>
            {artist.bio && <p className="mt-3 max-w-xl text-sm text-white/60">{artist.bio}</p>}
          </div>
        </div>
      </div>

      {/* Songs */}
      {songs.length > 0 && (
        <section className="pb-8">
          <h2 className="mb-4 text-lg font-bold text-white">Songs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-white/50">
                <tr>
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Role</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((s, i) => (
                  <tr key={`${s.song.id}-${s.role}`} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-4 text-white/50">{i + 1}</td>
                    <td className="py-2">
                      <Link to={`/songs/${s.song.id}`} className="flex items-center gap-3 group">
                        <img
                          src={resolveImageSrc({
                            url: s.song.cover_url,
                            filePath: s.song.cover_file_path,
                            bucket: "song-covers",
                          })}
                          alt=""
                          className="h-10 w-10 rounded shrink-0"
                        />
                        <span className="font-medium text-white group-hover:text-[var(--accent)]">{s.song.title}</span>
                      </Link>
                    </td>
                    <td className="py-2 text-white/50 hidden sm:table-cell">{s.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="pb-8">
          <h2 className="mb-4 text-lg font-bold text-white">Albums</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
        </section>
      )}

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