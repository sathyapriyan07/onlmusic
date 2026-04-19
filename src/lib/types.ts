export type AppRole = "admin" | "user";

export type Profile = {
  id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
};

export type Artist = {
  id: string;
  name: string;
  image_url: string | null;
  image_file_path: string | null;
  bio: string | null;
  published: boolean;
  created_at: string;
};

export type Album = {
  id: string;
  title: string;
  cover_url: string | null;
  cover_file_path: string | null;
  release_year: number | null;
  published: boolean;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  album_id: string | null;
  duration: string | null;
  year: number | null;
  music_rights: string | null;
  cover_url: string | null;
  cover_file_path: string | null;
  preview_url: string | null;
  published: boolean;
  created_at: string;
};

export type SongArtist = {
  id: number;
  song_id: string;
  artist_id: string;
  role: string;
};

export type AlbumArtist = {
  id: number;
  album_id: string;
  artist_id: string;
};

export type LinkEntityType = "song" | "album" | "artist";

export type LinkCategory = "official" | "live" | "lyrics" | "covers" | "other";

export type Link = {
  id: number;
  entity_type: LinkEntityType;
  entity_id: string;
  platform: string;
  url: string;
  title: string | null;
  category: LinkCategory | null;
  created_at: string;
};

export type HomepageSectionType = "songs" | "albums" | "artists";

export type HomepageSection = {
  id: number;
  title: string;
  type: HomepageSectionType;
  items: string[];
  order: number;
  created_at: string;
};

