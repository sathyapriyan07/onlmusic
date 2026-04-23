import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import MediaCard from "../components/MediaCard";
import { SectionHeader } from "../components/MediaRow";
import LinkButtons from "../components/LinkButtons";
import { ErrorState } from "../components/States";
import { getArtist, listArtistAlbums, listArtistSongs, listLinks, listArtists } from "../lib/db";
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
  const [relatedArtists, setRelatedArtists] = useState<Artist[]>([]);

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
        const [songRels, albumRels, artistLinks, allArtists] = await Promise.all([
          listArtistSongs(a.id),
          listArtistAlbums(a.id),
          listLinks({ type: "artist", id: a.id }),
          listArtists({ published: true }),
        ]);
        if (!mounted) return;
        setSongs(songRels.map((r) => ({ song: r.song, role: r.role })));
        setAlbums(albumRels.map((r) => r.album));
        setLinks(artistLinks);
        const related = allArtists.filter((ar) => ar.id !== a.id && ar.published).slice(0, 6);
        setRelatedArtists(related);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load artist.");
      } finally {
        if (mounted) setLoading(false);
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

  if (loading) return <div className="p-4 sm:p-8">Loading...</div>;
  if (err) return <ErrorState title="Error" message={err} />;
  if (!artist) return <ErrorState title="Not found" />;

  const singlesAndEPs = albums.filter((a) => {
    const title = a.title.toLowerCase();
    return title.includes("single") || title.includes("ep") || title.includes("ep.");
  });
  const fullAlbums = albums.filter((a) => {
    const title = a.title.toLowerCase();
    return !title.includes("single") && !title.includes("ep") && !title.includes("ep.");
  });

  return (
    <div className="pb-8">
      <Helmet>
        <title>{artist.name} · ONL Music</title>
      </Helmet>

      <div className="detail-hero items-center">
        <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 shrink-0 rounded-full overflow-hidden shadow-lg">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="detail-info">
          <div className="detail-type">Artist</div>
          <h1 className="detail-title">{artist.name}</h1>
          {artist.bio && (
            <p className="detail-subtitle max-w-xl line-clamp-2 text-xs sm:text-sm">{artist.bio}</p>
          )}
          <div className="mt-2 sm:mt-4 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
            <span>{albums.length} albums</span>
            <span className="text-[var(--text-dim)]">·</span>
            <span>{songs.length} songs</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-10 px-2 sm:px-0">
        {songs.length > 0 && (
          <section>
            <SectionHeader title="Top Songs" />
            <div className="space-y-1">
              {songs.slice(0, 10).map((s, i) => (
                <Link
                  key={`${s.song.id}-${s.role}`}
                  to={`/songs/${s.song.id}`}
                  className="track-row group"
                >
                  <span className="text-[var(--text-secondary)] text-xs sm:text-sm">{i + 1}</span>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img
                      src={resolveImageSrc({
                        url: s.song.cover_url,
                        filePath: s.song.cover_file_path,
                        bucket: "song-covers",
                      })}
                      alt=""
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-[var(--text)] truncate">{s.song.title}</div>
                      {s.song.year && (
                        <div className="text-xs text-[var(--text-secondary)] hidden sm:block">{s.song.year}</div>
                      )}
                    </div>
                  </div>
                  {s.song.duration && (
                    <span className="text-[var(--text-secondary)] text-xs sm:text-sm hidden sm:block">{s.song.duration}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {fullAlbums.length > 0 && (
          <section>
            <SectionHeader title="Albums" />
            <div className="hidden sm:block">
              <div className="media-scroll">
                {fullAlbums.map((a) => (
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
                    variant="album"
                    
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {fullAlbums.map((a) => (
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
                  variant="album"
                  
                />
              ))}
            </div>
          </section>
        )}

        {singlesAndEPs.length > 0 && (
          <section>
            <SectionHeader title="Singles and EPs" />
            <div className="hidden sm:block">
              <div className="media-scroll">
                {singlesAndEPs.map((a) => (
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
                    variant="album"
                    
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {singlesAndEPs.map((a) => (
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
                  variant="album"
                  
                />
              ))}
            </div>
          </section>
        )}

        {relatedArtists.length > 0 && (
          <section>
            <SectionHeader title="Related Artists" />
            <div className="hidden sm:block">
              <div className="media-scroll">
                {relatedArtists.map((a) => (
                  <MediaCard
                    key={a.id}
                    to={`/artists/${a.id}`}
                    image={resolveImageSrc({
                      url: a.image_url,
                      filePath: a.image_file_path,
                      bucket: "artist-images",
                    })}
                    title={a.name}
                    variant="artist"
                    
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:hidden">
              {relatedArtists.map((a) => (
                <Link key={a.id} to={`/artists/${a.id}`} className="flex flex-col items-center">
                  <img
                    src={resolveImageSrc({
                      url: a.image_url,
                      filePath: a.image_file_path,
                      bucket: "artist-images",
                    })}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <span className="text-xs text-[var(--text)] mt-1 text-center truncate w-full">{a.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {links.length > 0 && (
          <section>
            <SectionHeader title="Listen on" />
            <div className="flex flex-wrap gap-2">
              <LinkButtons links={links} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}