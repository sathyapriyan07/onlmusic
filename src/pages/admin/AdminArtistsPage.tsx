import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Artist } from "../../lib/types";
import { listArtists } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";

const BUCKET = "artist-images";

interface ItunesArtist {
  artistId: number;
  artistName: string;
  artistLinkUrl: string | null;
}

export default function AdminArtistsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ItunesArtist[]>([]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const list = await listArtists();
      setArtists(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load artists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setEditing(null);
    setName("");
    setBio("");
    setImageUrl("");
    setImageFile(null);
  }

  function startEdit(a: Artist) {
    setEditing(a);
    setName(a.name);
    setBio(a.bio ?? "");
    setImageUrl(a.image_url ?? "");
    setImageFile(null);
  }

  async function uploadIfAny(): Promise<string | null> {
    if (!imageFile) return editing?.image_file_path ?? null;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, imageFile, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const filePath = await uploadIfAny();
      const payload = {
        name: name.trim(),
        bio: bio.trim() || null,
        image_url: imageUrl.trim() || null,
        image_file_path: imageUrl.trim() ? null : filePath,
      };

      if (!payload.name) throw new Error("Name is required.");

      if (editing) {
        const { error } = await supabase.from("artists").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artists").insert(payload);
        if (error) throw error;
      }

      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save artist.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this artist?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("artists").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete artist.");
    }
  }

  async function searchItunes(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    setImportResults([]);
    try {
      const term = encodeURIComponent(q.trim());
      const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=musicArtist&limit=25`;
      const resp = await fetch(url);
      const data = await resp.json();
      const raw = data.resultCount > 0 ? data.results : [];
      const results: ItunesArtist[] = raw
        .filter((r: Record<string, unknown>) => r.artistId && r.artistName)
        .map((r: Record<string, unknown>) => ({
          artistId: r.artistId as number,
          artistName: r.artistName as string,
          artistLinkUrl: r.artistLinkUrl as string | null,
        }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search iTunes.");
    } finally {
      setImporting(false);
    }
  }

  function importFromItunes(r: ItunesArtist) {
    const existingArtist = artists.find(
      (a) => a.name.toLowerCase() === r.artistName.toLowerCase()
    );
    if (existingArtist) {
      if (!confirm(`"${r.artistName}" already exists. Select anyway?`)) return;
      startEdit(existingArtist);
    } else {
      resetForm();
      setName(r.artistName);
    }
    setImportModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Artists · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">Artists</h1>
            <p className="mt-1 text-sm text-muted">Create, edit, delete artists. Upload an image or paste an external URL.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setImportModalOpen(true)} className="btn-secondary rounded-2xl px-4 py-3 text-sm text-[var(--text)] hover:bg-white/10">
              iTunes import
            </button>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-app bg-panel2 px-4 py-3 text-sm text-[var(--text)] hover:bg-white/10">
              New artist
            </button>
          </div>
        </div>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-[var(--text)]">{editing ? "Edit artist" : "Create artist"}</div>
            <div className="mt-3 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-zinc-500" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={4} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-zinc-500" />
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-zinc-500" />
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-[var(--text)] file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black" />

              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={save} className="btn-primary rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                {editing ? (
                  <button type="button" onClick={resetForm} className="rounded-full bg-black/30 px-4 py-3 text-sm text-[var(--text)] hover:bg-black/40">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Existing</div>
            {loading ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : (
              <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-2">
                {artists.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-app bg-black/20 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-black/20">
                        {a.image_url || a.image_file_path ? (
                          <img
                            src={resolveImageSrc({ url: a.image_url, filePath: a.image_file_path, bucket: BUCKET })}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--text)]">{a.name}</div>
                        {a.bio ? <div className="truncate text-xs text-muted">{a.bio}</div> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button type="button" onClick={() => startEdit(a)} className="rounded-xl border border-app bg-panel2 px-3 py-2 text-xs text-[var(--text)] hover:bg-white/10">
                        Edit
                      </button>
                      <button type="button" onClick={() => del(a.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {artists.length === 0 ? <div className="text-sm text-muted">No artists yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-app bg-panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">iTunes Import</h2>
              <button type="button" onClick={() => setImportModalOpen(false)} className="text-muted hover:text-[var(--text)]">
                ✕
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchItunes(importQuery)}
                placeholder="Search artists..."
                className="flex-1 rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-zinc-500"
              />
              <button type="button" disabled={importing} onClick={() => searchItunes(importQuery)} className="btn-primary rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {importing ? "..." : "Search"}
              </button>
            </div>
            <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-2">
              {importResults.map((r) => (
                <div key={r.artistId} className="flex items-center gap-3 rounded-lg border border-app bg-black/20 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--text)]">{r.artistName}</div>
                  </div>
                  <button type="button" onClick={() => importFromItunes(r)} className="shrink-0 btn-primary rounded-lg px-3 py-2 text-xs font-semibold">
                    Import
                  </button>
                </div>
              ))}
              {importResults.length === 0 && !importing && importQuery && !err && (
                <div className="text-center text-sm text-muted">No artists found for "{importQuery}".</div>
              )}
              {importResults.length === 0 && !importing && !importQuery && (
                <div className="text-center text-sm text-muted">Search for an artist to import from iTunes.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
