import { supabase } from "./supabaseClient";
import type {
  Album,
  Artist,
  HomepageSection,
  Link,
  LinkEntityType,
  Song,
} from "./types";

export async function getProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,created_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listHomepageSections(): Promise<HomepageSection[]> {
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id,title,type,items,order,created_at")
    .order("order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomepageSection[];
}

export async function listArtists(params?: { q?: string; published?: boolean }): Promise<Artist[]> {
  let query = supabase
    .from("artists")
    .select("id,name,image_url,image_file_path,bio,published,created_at")
    .order("created_at", { ascending: false });

  if (params?.q) {
    query = query.ilike("name", `%${params.q}%`);
  }
  if (params?.published !== undefined) {
    query = query.eq("published", params.published);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Artist[];
}

export async function getArtist(id: string) {
  const { data, error } = await supabase
    .from("artists")
    .select("id,name,image_url,image_file_path,bio,published,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Artist | null;
}

export async function listAlbums(params?: { q?: string; published?: boolean }): Promise<Album[]> {
  let query = supabase
    .from("albums")
    .select("id,title,cover_url,cover_file_path,release_year,published,created_at")
    .order("created_at", { ascending: false });

  if (params?.q) query = query.ilike("title", `%${params.q}%`);
  if (params?.published !== undefined) {
    query = query.eq("published", params.published);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Album[];
}

export async function getAlbum(id: string) {
  const { data, error } = await supabase
    .from("albums")
    .select("id,title,cover_url,cover_file_path,release_year,published,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Album | null;
}

export async function listSongs(params?: {
  q?: string;
  year?: number;
  rights?: string;
  published?: boolean;
}): Promise<Song[]> {
  let query = supabase
    .from("songs")
    .select("id,title,album_id,duration,year,music_rights,cover_url,cover_file_path,preview_url,published,created_at")
    .order("created_at", { ascending: false });

  if (params?.q) query = query.ilike("title", `%${params.q}%`);
  if (params?.year) query = query.eq("year", params.year);
  if (params?.rights) query = query.ilike("music_rights", `%${params.rights}%`);
  if (params?.published !== undefined) {
    query = query.eq("published", params.published);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Song[];
}

export async function getSong(id: string) {
  const { data, error } = await supabase
    .from("songs")
    .select("id,title,album_id,duration,year,music_rights,cover_url,cover_file_path,preview_url,published,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Song | null;
}

export async function listLinks(entity: {
  type: LinkEntityType;
  id: string;
}): Promise<Link[]> {
  const { data, error } = await supabase
    .from("links")
    .select("id,entity_type,entity_id,platform,url,created_at")
    .eq("entity_type", entity.type)
    .eq("entity_id", entity.id)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Link[];
}

export async function getSongArtists(songId: string) {
  const { data, error } = await supabase
    .from("song_artists")
    .select("id,role,artist:artists(id,name,image_url,image_file_path)")
    .eq("song_id", songId)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: number;
    role: string;
    artist: Pick<Artist, "id" | "name" | "image_url" | "image_file_path">;
  }>;
}

export async function getAlbumArtists(albumId: string) {
  const { data, error } = await supabase
    .from("album_artists")
    .select("id,artist:artists(id,name,image_url,image_file_path)")
    .eq("album_id", albumId)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: number;
    artist: Pick<Artist, "id" | "name" | "image_url" | "image_file_path">;
  }>;
}

export async function listAlbumSongs(albumId: string) {
  const { data, error } = await supabase
    .from("songs")
    .select("id,title,album_id,duration,year,music_rights,cover_url,cover_file_path,created_at")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Song[];
}

export async function listArtistSongs(artistId: string) {
  const { data, error } = await supabase
    .from("song_artists")
    .select(
      "id,role,song:songs(id,title,album_id,duration,year,music_rights,cover_url,cover_file_path,created_at)",
    )
    .eq("artist_id", artistId)
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: number;
    role: string;
    song: Song;
  }>;
}

export async function listArtistAlbums(artistId: string) {
  const { data, error } = await supabase
    .from("album_artists")
    .select("id,album:albums(id,title,cover_url,cover_file_path,release_year,created_at)")
    .eq("artist_id", artistId)
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: number;
    album: Album;
  }>;
}

type SearchResult = {
  type: "song" | "album" | "artist";
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
};

export async function searchAll(q: string): Promise<SearchResult[]> {
  if (!q.trim() || q.length < 2) return [];
  const term = q.toLowerCase();
  const [songs, albums, artists] = await Promise.all([
    listSongs(),
    listAlbums(),
    listArtists(),
  ]);
  const results: SearchResult[] = [];
  for (const s of songs) {
    if (s.title.toLowerCase().includes(term)) {
      results.push({
        type: "song",
        id: s.id,
        title: s.title,
        subtitle: s.year ? String(s.year) : undefined,
        image: s.cover_url ?? undefined,
      });
    }
  }
  for (const a of albums) {
    if (a.title.toLowerCase().includes(term)) {
      results.push({
        type: "album",
        id: a.id,
        title: a.title,
        subtitle: a.release_year ? String(a.release_year) : undefined,
        image: a.cover_url ?? undefined,
      });
    }
  }
  for (const ar of artists) {
    if (ar.name.toLowerCase().includes(term)) {
      results.push({
        type: "artist",
        id: ar.id,
        title: ar.name,
        image: ar.image_url ?? undefined,
      });
    }
  }
  return results.slice(0, 10);
}
