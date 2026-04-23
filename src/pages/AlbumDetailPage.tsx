import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Play } from "lucide-react";
import MediaCard from "../components/MediaCard";
import { SectionHeader, MediaRow } from "../components/MediaRow";
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

  if (loading) return <div className="p-8">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!album) return <ErrorState title="Not found" />;

  const cover = resolveImageSrc({ url: album.cover_url, filePath: album.cover_file_path, bucket: "album-covers" });
  const youtubeLink = links.find((l) => l.platform.toLowerCase().includes("youtube")) ?? null;

  return (
    <div>
      <Helmet>
        <title>{album.title} · ONL Music</title>
      </Helmet>

      <div className="detail-hero">
        <img src={cover} alt="" className="detail-artwork" />
        <div className="detail-info">
          <div className="detail-type">Album</div>
          <h1 className="detail-title">{album.title}</h1>
          {artists.length > 0 && (
            <div className="detail-subtitle flex items-center gap-2 flex-wrap">
              {artists.map((a, i) => (
                <Link key={a.id} to={`/artists/${a.id}`} className="hover:text-[var(--accent)]">
                  {a.name}
                  {i < artists.length - 1 ? ", " : ""}
                </Link>
              ))}
              {album.release_year && (
                <>
                  <span className="text-[var(--text-dim)]">·</span>
                  <span>{album.release_year}</span>
                </>
              )}
              <span className="text-[var(--text-dim)]">·</span>
              <span>{songs.length} songs</span>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button className="play-button">
              <Play className="h-6 w-6 text-white fill-white ml-0.5" />
            </button>
            <LinkButtons links={links.filter((l) => !l.platform.toLowerCase().includes("youtube"))} />
          </div>
        </div>
      </div>

      <div className="space-y-10 pb-8">
        {youtubeLink && (
          <section>
            <PlayerEmbed url={youtubeLink.url} />
            {youtubeLink.title && <div className="mt-3 text-sm text-[var(--text-secondary)]">{youtubeLink.title}</div>}
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
                  <span className="text-[var(--text-secondary)] text-sm">{i + 1}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={resolveImageSrc({ url: item.song.cover_url, filePath: item.song.cover_file_path, bucket: "song-covers" })}
                      alt=""
                      className="h-10 w-10 rounded shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)] truncate">{item.song.title}</div>
                      {item.artists.length > 0 && (
                        <div className="text-xs text-[var(--text-secondary)] truncate">{item.artists.map((a) => a.name).join(", ")}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[var(--text-secondary)] text-sm">{item.song.duration ?? ""}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {moreAlbums.length > 0 && (
          <section>
            <SectionHeader title="More Albums" />
            <MediaRow>
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
            </MediaRow>
          </section>
        )}

        {artists.length > 0 && (
          <section>
            <SectionHeader title="Artists" />
            <MediaRow>
              {artists.map((a) => (
                <MediaCard
                  key={a.id}
                  to={`/artists/${a.id}`}
                  image={resolveImageSrc({ url: a.imageUrl, filePath: a.imageFilePath, bucket: "artist-images" })}
                  title={a.name}
                  variant="artist"
                  showPlayOnHover={false}
                />
              ))}
            </MediaRow>
          </section>
        )}
      </div>
    </div>
  );
}