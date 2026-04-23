import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Artist } from "../../lib/types";
import { listArtists } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";
import { AdminCard, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Plus, Edit2, Trash2, Upload, X, Mic2, Download, Search, Check } from "lucide-react";

const BUCKET = "artist-images";

interface ItunesArtistResult {
  artistId: number;
  artistName: string;
  artistLinkUrl: string | null;
  artistViewUrl: string | null;
  artworkUrl100: string | null;
}

export default function AdminArtistsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ItunesArtistResult[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<number>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);

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

  async function searchItunesArtists(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=musicArtist&limit=25`);
      const data = await resp.json();
      const results: ItunesArtistResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        artistId: r.artistId as number,
        artistName: r.artistName as string,
        artistLinkUrl: r.artistLinkUrl as string | null,
        artistViewUrl: r.artistViewUrl as string | null,
        artworkUrl100: r.artworkUrl100 as string | null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search iTunes.");
    } finally {
      setImporting(false);
    }
  }

  async function importFromItunes(r: ItunesArtistResult) {
    const existingArtist = artists.find(
      (a) => a.name.toLowerCase() === r.artistName.toLowerCase()
    );
    if (existingArtist) {
      if (!confirm(`"${r.artistName}" already exists. Select anyway?`)) return;
      startEdit(existingArtist);
    } else {
      resetForm();
      setName(r.artistName);
      if (r.artworkUrl100) {
        setImageUrl(r.artworkUrl100.replace("100x100", "600x600"));
      }
    }
    setImportModalOpen(false);
  }

  async function bulkImportSelected() {
    if (selectedImportIds.size === 0) return;
    setBulkImporting(true);
    setErr(null);
    try {
      const toImport = importResults.filter((r) => selectedImportIds.has(r.artistId));
      const inserts: Array<{ name: string; image_url: string | null; published: boolean }> = [];
      for (const r of toImport) {
        if (artists.some((a) => a.name.toLowerCase() === r.artistName.toLowerCase())) continue;
        inserts.push({
          name: r.artistName,
          image_url: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "600x600") : null,
          published: true,
        });
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from("artists").insert(inserts);
        if (error) throw error;
      }
      setImportModalOpen(false);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk import failed.");
    } finally {
      setBulkImporting(false);
    }
  }

  function toggleImportSelect(id: number) {
    setSelectedImportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          <AdminButton variant="secondary" onClick={() => setImportModalOpen(true)}>
            <Download className="w-4 h-4 mr-2" /> Import
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

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] bg-[var(--surface)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-app">
              <h2 className="text-lg font-semibold text-[var(--text)]">Import from iTunes</h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-app">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    value={importQuery}
                    onChange={(e) => setImportQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchItunesArtists(importQuery)}
                    placeholder="Search artists on iTunes..."
                    className="w-full pl-10 pr-4 py-3 bg-[var(--elevated)] rounded-xl text-[var(--text)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
                <AdminButton onClick={() => searchItunesArtists(importQuery)} disabled={importing || !importQuery.trim()}>
                  {importing ? "Searching..." : "Search"}
                </AdminButton>
              </div>
            </div>

            <div className="p-4 max-h-[400px] overflow-y-auto">
              {importing ? (
                <div className="py-8 text-center text-[var(--muted)]">Searching...</div>
              ) : importResults.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted)]">
                  <Mic2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Search for artists to import</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importResults.map((r) => {
                    const isSelected = selectedImportIds.has(r.artistId);
                    const exists = artists.some((a) => a.name.toLowerCase() === r.artistName.toLowerCase());
                    return (
                      <div
                        key={r.artistId}
                        className={`flex items-center gap-3 p-3 rounded-xl transition ${
                          exists
                            ? "opacity-50"
                            : isSelected
                            ? "bg-[var(--accent)]/10"
                            : "bg-[var(--elevated)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        <button
                          onClick={() => !exists && toggleImportSelect(r.artistId)}
                          disabled={exists}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition ${
                            isSelected
                              ? "bg-[var(--accent)] text-white"
                              : exists
                              ? "bg-[var(--hover)] text-[var(--muted)]"
                              : "border border-[var(--border)] text-transparent hover:border-[var(--accent)]"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <div className="w-12 h-12 rounded-full bg-[var(--hover)] overflow-hidden shrink-0">
                          {r.artworkUrl100 && (
                            <img src={r.artworkUrl100} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text)] truncate">{r.artistName}</p>
                        </div>
                        {exists && (
                          <span className="text-xs text-[var(--accent)]">Already exists</span>
                        )}
                        <button
                          onClick={() => importFromItunes(r)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--elevated)] hover:bg-[var(--hover)] text-sm text-[var(--text)]"
                        >
                          {exists ? "Edit" : "Import"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedImportIds.size > 0 && (
              <div className="p-4 border-t border-app">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted)]">
                    {selectedImportIds.size} selected
                  </span>
                  <AdminButton onClick={bulkImportSelected} disabled={bulkImporting}>
                    {bulkImporting ? "Importing..." : `Import ${selectedImportIds.size} Artists`}
                  </AdminButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}