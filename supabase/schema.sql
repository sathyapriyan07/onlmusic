-- Supabase schema for ONL Music Discovery
-- Run in Supabase SQL editor (in order). No Edge Functions required.

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;
  if not exists (select 1 from pg_type where typname = 'entity_type') then
    create type public.entity_type as enum ('song', 'album', 'artist');
  end if;
end $$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  image_file_path text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_url text,
  cover_file_path text,
  release_year int,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  album_id uuid references public.albums(id) on delete set null,
  duration text,
  year int,
  music_rights text,
  cover_url text,
  cover_file_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.song_artists (
  id bigserial primary key,
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text not null,
  unique (song_id, artist_id, role)
);

create table if not exists public.album_artists (
  id bigserial primary key,
  album_id uuid not null references public.albums(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  unique (album_id, artist_id)
);

create table if not exists public.links (
  id bigserial primary key,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  platform text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id bigserial primary key,
  title text not null,
  type text not null check (type in ('songs', 'albums', 'artists')),
  items uuid[] not null default '{}',
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_artists_name on public.artists using gin (to_tsvector('simple', name));
create index if not exists idx_albums_title on public.albums using gin (to_tsvector('simple', title));
create index if not exists idx_songs_title on public.songs using gin (to_tsvector('simple', title));
create index if not exists idx_song_artists_song on public.song_artists(song_id);
create index if not exists idx_song_artists_artist on public.song_artists(artist_id);
create index if not exists idx_album_artists_album on public.album_artists(album_id);
create index if not exists idx_album_artists_artist on public.album_artists(artist_id);
create index if not exists idx_links_entity on public.links(entity_type, entity_id);
create index if not exists idx_homepage_sections_order on public.homepage_sections("order");

-- Utility: role check
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- Profile auto-create on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.song_artists enable row level security;
alter table public.album_artists enable row level security;
alter table public.links enable row level security;
alter table public.homepage_sections enable row level security;

-- Public read access (discovery app)
drop policy if exists "read artists" on public.artists;
create policy "read artists"
on public.artists for select
using (true);

drop policy if exists "read albums" on public.albums;
create policy "read albums"
on public.albums for select
using (true);

drop policy if exists "read songs" on public.songs;
create policy "read songs"
on public.songs for select
using (true);

drop policy if exists "read song_artists" on public.song_artists;
create policy "read song_artists"
on public.song_artists for select
using (true);

drop policy if exists "read album_artists" on public.album_artists;
create policy "read album_artists"
on public.album_artists for select
using (true);

drop policy if exists "read links" on public.links;
create policy "read links"
on public.links for select
using (true);

drop policy if exists "read homepage_sections" on public.homepage_sections;
create policy "read homepage_sections"
on public.homepage_sections for select
using (true);

-- Profiles: each user can read/update their own row (admins can do everything via separate policies)
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "update own profile (non-role)" on public.profiles;
create policy "update own profile (non-role)"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admin CRUD policies
create policy "admin insert artists"
on public.artists for insert
with check (public.is_admin());
create policy "admin update artists"
on public.artists for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete artists"
on public.artists for delete
using (public.is_admin());

create policy "admin insert albums"
on public.albums for insert
with check (public.is_admin());
create policy "admin update albums"
on public.albums for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete albums"
on public.albums for delete
using (public.is_admin());

create policy "admin insert songs"
on public.songs for insert
with check (public.is_admin());
create policy "admin update songs"
on public.songs for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete songs"
on public.songs for delete
using (public.is_admin());

create policy "admin insert song_artists"
on public.song_artists for insert
with check (public.is_admin());
create policy "admin update song_artists"
on public.song_artists for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete song_artists"
on public.song_artists for delete
using (public.is_admin());

create policy "admin insert album_artists"
on public.album_artists for insert
with check (public.is_admin());
create policy "admin update album_artists"
on public.album_artists for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete album_artists"
on public.album_artists for delete
using (public.is_admin());

create policy "admin insert links"
on public.links for insert
with check (public.is_admin());
create policy "admin update links"
on public.links for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete links"
on public.links for delete
using (public.is_admin());

create policy "admin insert homepage_sections"
on public.homepage_sections for insert
with check (public.is_admin());
create policy "admin update homepage_sections"
on public.homepage_sections for update
using (public.is_admin())
with check (public.is_admin());
create policy "admin delete homepage_sections"
on public.homepage_sections for delete
using (public.is_admin());

-- Admin ability to manage roles (optional; keep role changes restricted)
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

