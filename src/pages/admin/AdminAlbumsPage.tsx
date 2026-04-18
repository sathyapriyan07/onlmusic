import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist } from "../../lib/types";
import { listAlbums, listArtists } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";

const BUCKET = "album-covers";

interface ItunesCollection {
  collectionId: number;
  collectionName: string;
  artistName: string;
  releaseDate: string | null;
  artworkUrl100: string | null;
}

export default function AdminAlbumsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [editing, setEditing] = useState<Album | null>(null);
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ItunesCollection[]>([]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [a, ar] = await Promise.all([listAlbums(), listArtists()]);
      setAlbums(a);
      setArtists(ar);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load albums.");
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
    setReleaseYear("");
    setCoverUrl("");
    setCoverFile(null);
    setArtistIds([]);
  }

  async function loadAlbumArtists(albumId: string) {
    const { data, error } = await supabase
      .from("album_artists")
      .select("artist_id")
      .eq("album_id", albumId);
    if (error) throw error;
    setArtistIds((data ?? []).map((r) => r.artist_id as string));
  }

  async function startEdit(a: Album) {
    setEditing(a);
    setTitle(a.title);
    setReleaseYear(a.release_year ? String(a.release_year) : "");
    setCoverUrl(a.cover_url ?? "");
    setCoverFile(null);
    await loadAlbumArtists(a.id);
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
        release_year: releaseYear ? Number(releaseYear) : null,
        cover_url: coverUrl.trim() || null,
        cover_file_path: coverUrl.trim() ? null : filePath,
      };
      if (!payload.title) throw new Error("Title is required.");

      let albumId = editing?.id ?? null;

      if (editing) {
        const { error } = await supabase.from("albums").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("albums").insert(payload).select("id").single();
        if (error) throw error;
        albumId = (data as { id: string }).id;
      }

      if (!albumId) throw new Error("Missing album id.");

      // Replace album artists junction
      await supabase.from("album_artists").delete().eq("album_id", albumId);
      if (artistIds.length) {
        const { error } = await supabase.from("album_artists").insert(
          artistIds.map((artistId) => ({
            album_id: albumId,
            artist_id: artistId,
          })),
        );
        if (error) throw error;
      }

      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save album.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this album?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("albums").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete album.");
    }
  }

  async function searchItunes(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=25`);
      const data = await resp.json();
      const results: ItunesCollection[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        collectionId: r.collectionId as number,
        collectionName: r.collectionName as string,
        artistName: r.artistName as string,
        releaseDate: r.releaseDate as string | null,
        artworkUrl100: r.artworkUrl100 as string | null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search iTunes.");
    } finally {
      setImporting(false);
    }
  }

  function importFromItunes(r: ItunesCollection) {
    const existingAlbum = albums.find(
      (a) => a.title.toLowerCase() === r.collectionName.toLowerCase()
    );
    if (existingAlbum) {
      if (!confirm(`"${r.collectionName}" already exists. Select anyway?`)) return;
      startEdit(existingAlbum);
    } else {
      resetForm();
      setTitle(r.collectionName);
      if (r.releaseDate) {
        setReleaseYear(r.releaseDate.slice(0, 4));
      }
      if (r.artworkUrl100) {
        setCoverUrl(r.artworkUrl100.replace("100x100", "600x600"));
      }
    }
    setImportModalOpen(false);
  }

  const sortedArtists = useMemo(() => [...artists].sort((a, b) => a.name.localeCompare(b.name)), [artists]);

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Albums · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Albums</h1>
            <p className="mt-1 text-sm text-muted">CRUD albums and assign multiple artists.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setImportModalOpen(true)} className="btn-secondary rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10">
              iTunes import
            </button>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-app bg-panel2 px-4 py-3 text-sm text-white hover:bg-white/10">
              New album
            </button>
          </div>
        </div>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-white">{editing ? "Edit album" : "Create album"}</div>
            <div className="mt-3 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              <input value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Release year (optional)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Cover URL (optional)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black" />

              <div className="rounded-lg border border-app bg-black/20 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Album artists</div>
                <div className="max-h-44 space-y-2 overflow-auto pr-1">
                  {sortedArtists.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={artistIds.includes(a.id)}
                        onChange={(e) => {
                          setArtistIds((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)));
                        }}
                      />
                      <span className="truncate">{a.name}</span>
                    </label>
                  ))}
                  {sortedArtists.length === 0 ? <div className="text-sm text-muted">Create artists first.</div> : null}
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
                {albums.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-app bg-black/20 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-black/20">
                        {a.cover_url || a.cover_file_path ? (
                          <img
                            src={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: BUCKET })}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{a.title}</div>
                        {a.release_year ? <div className="text-xs text-muted">{a.release_year}</div> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button type="button" onClick={() => startEdit(a)} className="rounded-xl border border-app bg-panel2 px-3 py-2 text-xs text-white hover:bg-white/10">
                        Edit
                      </button>
                      <button type="button" onClick={() => del(a.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {albums.length === 0 ? <div className="text-sm text-muted">No albums yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-app bg-panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">iTunes Import</h2>
              <button type="button" onClick={() => setImportModalOpen(false)} className="text-muted hover:text-white">
                ✕
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchItunes(importQuery)}
                placeholder="Search albums..."
                className="flex-1 rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <button type="button" disabled={importing} onClick={() => searchItunes(importQuery)} className="btn-primary rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {importing ? "..." : "Search"}
              </button>
            </div>
            <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-2">
              {importResults.map((r) => (
                <div key={r.collectionId} className="flex items-center gap-3 rounded-lg border border-app bg-black/20 p-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/40">
                    {r.artworkUrl100 && <img src={r.artworkUrl100} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{r.collectionName}</div>
                    <div className="truncate text-xs text-muted">{r.artistName}</div>
                  </div>
                  <button type="button" onClick={() => importFromItunes(r)} className="shrink-0 btn-primary rounded-lg px-3 py-2 text-xs font-semibold">
                    Import
                  </button>
                </div>
              ))}
              {importResults.length === 0 && !importing && (
                <div className="text-center text-sm text-muted">Search for an album to import from iTunes.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
