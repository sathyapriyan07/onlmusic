import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";

const BUCKET = "song-covers";

type Credit = { artist_id: string; role: string };

export default function AdminSongsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [editing, setEditing] = useState<Song | null>(null);
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [rights, setRights] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [s, al, ar] = await Promise.all([listSongs(), listAlbums(), listArtists()]);
      setSongs(s);
      setAlbums(al);
      setArtists(ar);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load songs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setAlbumId("");
    setYear("");
    setDuration("");
    setRights("");
    setCoverUrl("");
    setCoverFile(null);
    setCredits([]);
  }

  async function loadSongArtists(songId: string) {
    const { data, error } = await supabase
      .from("song_artists")
      .select("artist_id,role")
      .eq("song_id", songId);
    if (error) throw error;
    setCredits((data ?? []).map((r) => ({ artist_id: r.artist_id as string, role: r.role as string })));
  }

  async function startEdit(s: Song) {
    setEditing(s);
    setTitle(s.title);
    setAlbumId(s.album_id ?? "");
    setYear(s.year ? String(s.year) : "");
    setDuration(s.duration ?? "");
    setRights(s.music_rights ?? "");
    setCoverUrl(s.cover_url ?? "");
    setCoverFile(null);
    await loadSongArtists(s.id);
  }

  async function uploadIfAny(): Promise<string | null> {
    if (!coverFile) return editing?.cover_file_path ?? null;
    const ext = coverFile.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, coverFile, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const filePath = await uploadIfAny();
      const payload = {
        title: title.trim(),
        album_id: albumId || null,
        year: year ? Number(year) : null,
        duration: duration.trim() || null,
        music_rights: rights.trim() || null,
        cover_url: coverUrl.trim() || null,
        cover_file_path: coverUrl.trim() ? null : filePath,
      };
      if (!payload.title) throw new Error("Title is required.");

      let songId = editing?.id ?? null;

      if (editing) {
        const { error } = await supabase.from("songs").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("songs").insert(payload).select("id").single();
        if (error) throw error;
        songId = (data as { id: string }).id;
      }

      if (!songId) throw new Error("Missing song id.");

      await supabase.from("song_artists").delete().eq("song_id", songId);
      const cleanCredits = credits
        .map((c) => ({ artist_id: c.artist_id, role: c.role.trim() }))
        .filter((c) => c.artist_id && c.role);
      if (cleanCredits.length) {
        const { error } = await supabase.from("song_artists").insert(
          cleanCredits.map((c) => ({
            song_id: songId,
            artist_id: c.artist_id,
            role: c.role,
          })),
        );
        if (error) throw error;
      }

      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save song.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this song?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete song.");
    }
  }

  const sortedAlbums = useMemo(() => [...albums].sort((a, b) => a.title.localeCompare(b.title)), [albums]);
  const sortedArtists = useMemo(() => [...artists].sort((a, b) => a.name.localeCompare(b.name)), [artists]);

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Songs · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Songs</h1>
            <p className="mt-1 text-sm text-muted">CRUD songs, assign album, and add multiple artists with roles (singer, composer, lyricist…).</p>
          </div>
          <button type="button" onClick={resetForm} className="btn-secondary rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10">
            New song
          </button>
        </div>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-white">{editing ? "Edit song" : "Create song"}</div>
            <div className="mt-3 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="">No album</option>
                {sortedAlbums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
                <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (e.g. 3:42)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              </div>
              <input value={rights} onChange={(e) => setRights(e.target.value)} placeholder="Music rights (optional)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />

              <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Cover URL (optional)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black" />

              <div className="rounded-lg border border-app bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">Credits</div>
                  <button
                    type="button"
                    onClick={() => setCredits((prev) => [...prev, { artist_id: "", role: "" }])}
                        className="btn-secondary rounded-xl px-3 py-2 text-xs text-white hover:bg-white/10"
                  >
                    Add credit
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {credits.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <select
                        value={c.artist_id}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCredits((prev) => prev.map((x, i) => (i === idx ? { ...x, artist_id: v } : x)));
                        }}
                        className="rounded-lg border border-app bg-black/30 px-3 py-2 text-sm text-white outline-none"
                      >
                        <option value="">Select artist</option>
                        {sortedArtists.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={c.role}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCredits((prev) => prev.map((x, i) => (i === idx ? { ...x, role: v } : x)));
                        }}
                        placeholder="Role (singer/composer/lyricist...)"
                        className="rounded-lg border border-app bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setCredits((prev) => prev.filter((_, i) => i !== idx))}
                        className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 sm:w-auto"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {credits.length === 0 ? <div className="text-sm text-muted">Add one or more credits (artist + role).</div> : null}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={save} className="btn-primary rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                {editing ? (
                  <button type="button" onClick={resetForm} className="rounded-full bg-black/30 px-4 py-3 text-sm text-white hover:bg-black/40">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-white">Existing</div>
            {loading ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : (
              <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-2">
                {songs.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-app bg-black/20 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-black/20">
                        <img
                          src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: BUCKET })}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{s.title}</div>
                        <div className="truncate text-xs text-muted">
                          {[s.year ? String(s.year) : "", s.duration ?? ""].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button type="button" onClick={() => startEdit(s)} className="btn-secondary rounded-xl px-3 py-2 text-xs text-white hover:bg-white/10">
                        Edit
                      </button>
                      <button type="button" onClick={() => del(s.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {songs.length === 0 ? <div className="text-sm text-muted">No songs yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
