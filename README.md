# onlmusic

Music discovery web app (NOT a streaming platform). Stores metadata + external links (YouTube/Spotify/Apple Music/etc.). If a YouTube link exists, the song page shows an embedded player.

## Tech
- Frontend: React + Vite + TypeScript
- Backend: Supabase (Postgres + Auth + Storage)
- No Supabase Edge Functions
- UI: dark, clean, media-focused (YouTube Music-inspired)

## Quick start
1) Install deps
```bash
npm install
```

2) Configure env
- Copy `.env.example` → `.env`
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

3) Supabase setup
- Follow `supabase/SETUP.md` (includes `supabase/schema.sql`)

4) Run
```bash
npm run dev
```

## Routes
- `/` Home (admin-controlled section rows)
- `/songs` Songs (grid + search/filter)
- `/songs/:id` Song detail (hero + credits + external links + YouTube embed if available)
- `/albums` Albums (grid + search)
- `/albums/:id` Album detail (album info + artists + tracklist + links)
- `/artists` Artists (grid + search)
- `/artists/:id` Artist detail (hero + bio + songs + albums + links)
- `/login` Email/password auth (Supabase)
- `/admin/*` Admin dashboard (CRUD; admin only)

## Folder structure (high level)
- `src/lib/*` Supabase client + DB helpers + utils
- `src/state/*` Auth session + profile/role loading
- `src/components/*` UI building blocks (cards, carousels, embeds, loaders)
- `src/pages/*` App pages
- `src/pages/admin/*` Admin CRUD screens
- `supabase/schema.sql` Database schema + RLS policies + triggers
- `supabase/SETUP.md` Supabase setup guide
