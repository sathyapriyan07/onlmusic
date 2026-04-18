import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Artist } from "../../lib/types";
import { listArtists } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";

const BUCKET = "artist-images";

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

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Artists · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-3xl border border-app bg-white/5 p-6 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Artists</h1>
            <p className="mt-1 text-sm text-muted">Create, edit, delete artists. Upload an image or paste an external URL.</p>
          </div>
          <button type="button" onClick={resetForm} className="rounded-2xl border border-app bg-panel2 px-4 py-3 text-sm text-white hover:bg-white/10">
            New artist
          </button>
        </div>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-3xl border border-app bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">{editing ? "Edit artist" : "Create artist"}</div>
            <div className="mt-3 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-2xl border border-app bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 backdrop-blur" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={4} className="w-full rounded-2xl border border-app bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 backdrop-blur" />
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" className="w-full rounded-2xl border border-app bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 backdrop-blur" />
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-app bg-white/5 px-4 py-3 text-sm text-white file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-black backdrop-blur" />

              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={save} className="btn-primary rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                {editing ? (
                  <button type="button" onClick={resetForm} className="btn-secondary rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-app bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Existing</div>
            {loading ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : (
              <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-2">
                {artists.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-app bg-white/5 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-black/20">
                        <img
                          src={resolveImageSrc({ url: a.image_url, filePath: a.image_file_path, bucket: BUCKET })}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{a.name}</div>
                        {a.bio ? <div className="truncate text-xs text-muted">{a.bio}</div> : null}
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
                {artists.length === 0 ? <div className="text-sm text-muted">No artists yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
