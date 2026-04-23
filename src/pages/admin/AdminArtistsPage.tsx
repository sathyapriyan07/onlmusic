import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Artist } from "../../lib/types";
import { listArtists } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";
import { AdminCard, AdminModal, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Plus, Search, Edit2, Trash2, Upload, X, Mic2 } from "lucide-react";

const BUCKET = "artist-images";

interface ItunesArtist {
  artistId: number;
  artistName: string;
  artistLinkUrl: string | null;
}

export default function AdminArtistsPage() {
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

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ItunesArtist[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<number>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importSource, setImportSource] = useState<"itunes" | "deezer">("itunes");

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

  async function doSearch() {
    if (importSource === "itunes") await searchItunes(importQuery);
    else await searchDeezer(importQuery);
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

  async function searchDeezer(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    setImportResults([]);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://api.deezer.com/search/artist?q=${term}&limit=25`);
      const data = await resp.json();
      const results: ItunesArtist[] = (data.data ?? []).map((r: Record<string, unknown>) => ({
        artistId: r.id as number,
        artistName: r.name as string,
        artistLinkUrl: r.link as string | null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search Deezer.");
    } finally {
      setImporting(false);
    }
  }

  async function bulkImportSelected() {
    if (selectedImportIds.size === 0) return;
    setBulkImporting(true);
    setErr(null);
    try {
      const toImport = importResults.filter((r) => selectedImportIds.has(r.artistId));
      const inserts: Array<{ name: string; published: boolean }> = [];
      for (const r of toImport) {
        if (artists.some((a) => a.name.toLowerCase() === r.artistName.toLowerCase())) continue;
        inserts.push({ name: r.artistName, published: true });
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from("artists").insert(inserts);
        if (error) throw error;
        await refresh();
      }
      setImportModalOpen(false);
      setSelectedImportIds(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to bulk import.");
    } finally {
      setBulkImporting(false);
    }
  }

  function toggleSelection(id: number) {
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
          <AdminButton variant="secondary" onClick={() => { setImportSource("itunes"); setImportModalOpen(true); }}>
            <Search className="w-4 h-4 mr-2" /> Import
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
      <AdminModal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import Artists">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setImportSource("itunes")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                importSource === "itunes" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              iTunes
            </button>
            <button
              onClick={() => setImportSource("deezer")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                importSource === "deezer" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              Deezer
            </button>
          </div>
          
          <div className="flex gap-2">
            <input
              value={importQuery}
              onChange={(e) => setImportQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search artists..."
              className="flex-1 px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none"
            />
            <AdminButton onClick={doSearch} disabled={importing}>
              {importing ? "..." : <Search className="w-4 h-4" />}
            </AdminButton>
          </div>

          {importResults.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-app">
              <div className="text-sm text-[var(--muted)]">
                <button onClick={() => setSelectedImportIds(new Set(importResults.map(r => r.artistId)))} className="hover:text-[var(--text)] mr-3">
                  Select All
                </button>
                <span className="text-[var(--accent)]">{selectedImportIds.size} selected</span>
              </div>
              <AdminButton onClick={bulkImportSelected} disabled={selectedImportIds.size === 0 || bulkImporting}>
                {bulkImporting ? "Importing..." : "Import"}
              </AdminButton>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto space-y-2">
            {importResults.map((r) => (
              <div
                key={r.artistId}
                onClick={() => toggleSelection(r.artistId)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedImportIds.has(r.artistId) ? "bg-[var(--accent)]/20" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedImportIds.has(r.artistId)}
                  onChange={() => {}}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                <span className="text-[var(--text)]">{r.artistName}</span>
              </div>
            ))}
          </div>
        </div>
      </AdminModal>
    </div>
  );
}