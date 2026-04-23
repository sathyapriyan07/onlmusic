import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Artist } from "../../lib/types";
import { listArtists } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";
import { AdminCard, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Plus, Edit2, Trash2, Upload, X, Mic2 } from "lucide-react";

const BUCKET = "artist-images";

export default function AdminArtistsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<Artist | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);

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
    setShowForm(false);
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
    setShowForm(true);
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
    if (!name.trim()) return;
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

  const filteredArtists = artists.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <Helmet>
        <title>Artists · Admin</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Artists</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage your artist catalog</p>
        </div>
        <div className="flex gap-2">
          <AdminButton variant="secondary" onClick={() => navigate("/admin/artists/import")}>
            Import
          </AdminButton>
          <AdminButton onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Artist
          </AdminButton>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Card */}
        <AdminCard title={editing ? "Edit Artist" : "Add New Artist"}>
          <div className="space-y-4">
            <FormField label="Artist Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter artist name"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Artist biography (optional)"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
            </FormField>

            <FormField label="Image">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={imageFileRef}
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageFileRef.current?.click()}
                  className="flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-app hover:border-[var(--accent)] transition-colors"
                >
                  <Upload className="w-6 h-6 text-[var(--muted)]" />
                </button>
                {(imageFile || imageUrl || editing?.image_url || editing?.image_file_path) && (
                  <div className="relative">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : resolveImageSrc({ 
                        url: imageUrl || (editing?.image_url ?? undefined), 
                        filePath: editing?.image_file_path ?? undefined, 
                        bucket: BUCKET 
                      })}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImageUrl(""); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste image URL"
                className="w-full mt-3 px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormActions>
              <AdminButton onClick={save} disabled={saving || !name.trim()}>
                {saving ? "Saving..." : editing ? "Update Artist" : "Add Artist"}
              </AdminButton>
              {showForm && <AdminButton variant="secondary" onClick={resetForm}>Cancel</AdminButton>}
            </FormActions>
          </div>
        </AdminCard>

        {/* List Card */}
        <AdminCard 
          title={`Artists (${filteredArtists.length})`}
          action={
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="px-3 py-1.5 bg-white/5 border border-app rounded-lg text-sm text-[var(--text)] outline-none"
            />
          }
        >
          {loading ? (
            <div className="py-8 text-center text-[var(--muted)]">Loading...</div>
          ) : filteredArtists.length === 0 ? (
            <AdminEmpty title="No artists found" description="Add your first artist to get started" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredArtists.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden shrink-0">
                    {a.image_url || a.image_file_path ? (
                      <img
                        src={resolveImageSrc({ url: a.image_url, filePath: a.image_file_path, bucket: BUCKET })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Mic2 className="w-5 h-5 text-[var(--muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text)] truncate">{a.name}</p>
                    {a.bio && <p className="text-xs text-[var(--muted)] truncate">{a.bio}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(a)}
                      className="p-2 rounded-lg bg-white/10 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => del(a.id)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}