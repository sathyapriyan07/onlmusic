import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Play } from "lucide-react";
import MediaCard from "../components/MediaCard";
import { SectionHeader } from "../components/MediaRow";
import PlayerEmbed from "../components/PlayerEmbed";
import LinkButtons from "../components/LinkButtons";
import { ErrorState } from "../components/States";
import { getAlbum, getAlbumArtists, getSongArtists, listAlbumSongs, listLinks, listAlbums } from "../lib/db";
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
  const [moreAlbums, setMoreAlbums] = useState<Album[]>([]);

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
        const [rels, albumSongsList, albumLinks, allAlbums] = await Promise.all([
          getAlbumArtists(a.id),
          listAlbumSongs(a.id),
          listLinks({ type: "album", id: a.id }),
          listAlbums({ published: true }),
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

        const relatedAlbums = allAlbums.filter((al) => al.id !== a.id && al.published).slice(0, 6);
        setMoreAlbums(relatedAlbums);
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

  if (loading) return <div className="p-4 sm:p-8">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!album) return <ErrorState title="Not found" />;

  const cover = resolveImageSrc({ url: album.cover_url, filePath: album.cover_file_path, bucket: "album-covers" });
  const youtubeLink = links.find((l) => l.platform.toLowerCase().includes("youtube")) ?? null;

  return (
    <div className="pb-8">
      <Helmet>
        <title>{album.title} · ONL Music</title>
      </Helmet>

      <div className="detail-hero">
        <img src={cover} alt="" className="detail-artwork" />
        <div className="detail-info">
          <div className="detail-type">Album</div>
          <h1 className="detail-title">{album.title}</h1>
          {artists.length > 0 && (
            <div className="detail-subtitle flex items-center gap-1 sm:gap-2 flex-wrap justify-center sm:justify-start">
              {artists.map((a, i) => (
                <Link key={a.id} to={`/artists/${a.id}`} className="text-[var(--accent)] text-xs sm:text-sm">
                  {a.name}
                  {i < artists.length - 1 ? ", " : ""}
                </Link>
              ))}
            </div>
          )}
          {album.release_year && (
            <div className="detail-subtitle text-xs mt-1">
              {album.release_year} · {songs.length} songs
            </div>
          )}

          <div className="mt-4 sm:mt-6 flex items-center gap-2 sm:gap-3">
            <button className="play-button !w-12 !h-12 sm:!w-14 sm:!h-14">
              <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white fill-white ml-0.5" />
            </button>
            <div className="flex flex-wrap gap-2">
              <LinkButtons links={links.filter((l) => !l.platform.toLowerCase().includes("youtube"))} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-10 px-2 sm:px-0">
        {youtubeLink && (
          <section>
            <PlayerEmbed url={youtubeLink.url} />
            {youtubeLink.title && <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-[var(--text-secondary)]">{youtubeLink.title}</div>}
          </section>
        )}

        {songs.length > 0 && (
          <section>
            <SectionHeader title="Tracks" />
            <div className="space-y-1">
              {songs.map((item, i) => (
                <Link
                  key={item.song.id}
                  to={`/songs/${item.song.id}`}
                  className="track-row group"
                >
                  <span className="text-[var(--text-secondary)] text-xs sm:text-sm">{i + 1}</span>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img
                      src={resolveImageSrc({ url: item.song.cover_url, filePath: item.song.cover_file_path, bucket: "song-covers" })}
                      alt=""
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[var(--text)] truncate">{item.song.title}</div>
                      {item.artists.length > 0 && (
                        <div className="text-xs text-[var(--text-secondary)] truncate hidden sm:block">{item.artists.map((a) => a.name).join(", ")}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[var(--text-secondary)] text-xs sm:text-sm hidden sm:block">{item.song.duration ?? ""}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {moreAlbums.length > 0 && (
          <section>
            <SectionHeader title="More Albums" />
            <div className="hidden sm:block">
              <div className="media-scroll">
                {moreAlbums.map((a) => (
                  <MediaCard
                    key={a.id}
                    to={`/albums/${a.id}`}
                    image={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
                    title={a.title}
                    subtitle={a.release_year ? String(a.release_year) : undefined}
                    variant="album"
                    
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:hidden">
              {moreAlbums.map((a) => (
                <MediaCard
                  key={a.id}
                  to={`/albums/${a.id}`}
                  image={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: "album-covers" })}
                  title={a.title}
                  subtitle={a.release_year ? String(a.release_year) : undefined}
                  variant="album"
                  
                />
              ))}
            </div>
          </section>
        )}

        {artists.length > 0 && (
          <section>
            <SectionHeader title="Artists" />
            <div className="hidden sm:block">
              <div className="media-scroll">
                {artists.map((a) => (
                  <MediaCard
                    key={a.id}
                    to={`/artists/${a.id}`}
                    image={resolveImageSrc({ url: a.imageUrl, filePath: a.imageFilePath, bucket: "artist-images" })}
                    title={a.name}
                    variant="artist"
                    
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:hidden">
              {artists.map((a) => (
                <Link key={a.id} to={`/artists/${a.id}`} className="flex flex-col items-center">
                  <img
                    src={resolveImageSrc({ url: a.imageUrl, filePath: a.imageFilePath, bucket: "artist-images" })}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <span className="text-xs text-[var(--text)] mt-1 text-center truncate w-full">{a.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}