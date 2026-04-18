# Supabase Setup (ONL Music Discovery)

## 1) Create project + get keys
- Create a new Supabase project.
- In **Project Settings → API**, copy:
  - `Project URL` → `VITE_SUPABASE_URL`
  - `anon public` key → `VITE_SUPABASE_ANON_KEY`
- Create a local `.env` file from `.env.example`.

## 2) Run SQL schema
- Open **SQL Editor** in Supabase.
- Paste and run `supabase/schema.sql`.

## 3) Storage buckets (optional but recommended)
Create public-read buckets:
- `artist-images`
- `album-covers`
- `song-covers`

Suggested bucket policies (Storage → Policies):
- Allow public read.
- Allow write/update/delete only for admins (or authenticated + admin check).

This app stores both an optional external URL and an optional storage `file_path`. UI rule:
- If `*_url` exists → use it
- Else if `*_file_path` exists → use Supabase Storage public URL

## 4) Create an admin user
- Sign up in the app (or Supabase Auth UI).
- Then run this in SQL editor, replacing the UUID:

```sql
update public.profiles
set role = 'admin'
where id = '00000000-0000-0000-0000-000000000000';
```

## 5) Auth settings
- Enable **Email** provider (Auth → Providers).
- (Optional) Disable email confirmations for local testing.

## 6) Run the app
```bash
npm install
npm run dev
```

