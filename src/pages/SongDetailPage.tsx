import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Play } from "lucide-react";
import MediaCard from "../components/MediaCard";
import { SectionHeader, MediaRow } from "../components/MediaRow";
import AudioPreview from "../components/AudioPreview";
import LinkButtons from "../components/LinkButtons";
import { ErrorState } from "../components/States";
import { getAlbum, getSong, getSongArtists, listLinks, listSongs } from "../lib/db";
import type { Album, Link as LinkRow, Song } from "../lib/types";
import { resolveImageSrc } from "../lib/images";

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return match ? match[1] : null;
}

export default function SongDetailPage() {
  const { id } = useParams();
  const songId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [artists, setArtists] = useState<Array<{ role: string; id: string; name: string; imageUrl: string | null; imageFilePath: string | null }>>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [albumSongs, setAlbumSongs] = useState<Array<{ song: Song; artists: Array<{ id: string; name: string }> }>>([]);
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
          const albumTracklist = allSongs.filter((sg) => sg.album_id === s.album_id && sg.id !== s.id && sg.published).slice(0, 10);
          const withArtists = await Promise.all(
            albumTracklist.map(async (sg) => {
              const sas = await getSongArtists(sg.id);
              return { song: sg, artists: sas.map((sa) => ({ id: sa.artist.id, name: sa.artist.name })) };
            })
          );
          setAlbumSongs(withArtists);
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

  const youtubeLinks = links.filter((l) => l.platform.toLowerCase().includes("youtube"));
  const otherLinks = links.filter((l) => !l.platform.toLowerCase().includes("youtube"));

  if (loading) return <div className="p-8">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!song) return <ErrorState title="Not found" />;

  const cover = resolveImageSrc({ url: song.cover_url, filePath: song.cover_file_path, bucket: "song-covers" });

  return (
    <div>
      <Helmet>
        <title>{song.title} · ONL Music</title>
      </Helmet>

      <div className="detail-hero">
        <img src={cover} alt="" className="detail-artwork" />
        <div className="detail-info">
          <div className="detail-type">Song</div>
          <h1 className="detail-title">{song.title}</h1>
          {artists.length > 0 && (
            <div className="detail-subtitle flex items-center gap-2 flex-wrap">
              {artists.map((a, i) => (
                <Link key={a.id} to={`/artists/${a.id}`} className="hover:text-[var(--accent)]">
                  {a.name}
                  {i < artists.length - 1 ? ", " : ""}
                </Link>
              ))}
              {album && (
                <>
                  <span className="text-[var(--text-dim)]">·</span>
                  <Link to={`/albums/${album.id}`} className="hover:text-[var(--accent)]">{album.title}</Link>
                </>
              )}
              {song.year && (
                <>
                  <span className="text-[var(--text-dim)]">·</span>
                  <span>{song.year}</span>
                </>
              )}
              {song.duration && (
                <>
                  <span className="text-[var(--text-dim)]">·</span>
                  <span>{song.duration}</span>
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button className="play-button">
              <Play className="h-6 w-6 text-white fill-white ml-0.5" />
            </button>
            {song.preview_url && (
              <div className="w-64">
                <AudioPreview src={song.preview_url} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-10 pb-8">
        {youtubeLinks.length > 0 && (
          <section>
            <SectionHeader title="Videos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {youtubeLinks.map((link) => {
                const videoId = extractVideoId(link.url);
                if (!videoId) return null;
                return (
                  <div key={link.id} className="rounded-xl overflow-hidden bg-[var(--elevated)]">
                    <div className="aspect-video w-full">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                        title={link.title || "YouTube video"}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                    {link.title && (
                      <p className="px-4 py-3 text-sm font-medium text-[var(--text)]">{link.title}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {albumSongs.length > 0 && (
          <section>
            <SectionHeader 
              title={`More from ${album?.title}`} 
              moreHref={album ? `/albums/${album.id}` : undefined}
            />
            <MediaRow>
              {albumSongs.map((item) => (
                <MediaCard
                  key={item.song.id}
                  to={`/songs/${item.song.id}`}
                  image={resolveImageSrc({ url: item.song.cover_url, filePath: item.song.cover_file_path, bucket: "song-covers" })}
                  title={item.song.title}
                  subtitle={item.artists.map((a) => a.name).join(", ")}
                  variant="song"
                />
              ))}
            </MediaRow>
          </section>
        )}

        {artistSongs.length > 0 && (
          <section>
            <SectionHeader 
              title={`More by ${artists[0]?.name}`}
              moreHref={artists[0] ? `/artists/${artists[0].id}` : undefined}
            />
            <MediaRow>
              {artistSongs.map((s) => (
                <MediaCard
                  key={s.id}
                  to={`/songs/${s.id}`}
                  image={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                  title={s.title}
                  subtitle={s.duration ?? undefined}
                  variant="song"
                />
              ))}
            </MediaRow>
          </section>
        )}

        {otherLinks.length > 0 && (
          <section>
            <SectionHeader title="Listen on" />
            <LinkButtons links={otherLinks} />
          </section>
        )}

        {artists.length > 0 && (
          <section>
            <SectionHeader title="Credits" />
            <div className="flex gap-3 flex-wrap">
              {artists.map((a) => (
                <Link
                  key={`${a.id}-${a.role}`}
                  to={`/artists/${a.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--elevated)] hover:bg-[var(--hover)] transition"
                >
                  <img
                    src={resolveImageSrc({ url: a.imageUrl ?? undefined, filePath: a.imageFilePath ?? undefined, bucket: "artist-images" })}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-xs text-[var(--accent)]">{a.role}</div>
                    <div className="font-medium text-[var(--text)]">{a.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}