import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { MusicRights } from "../../lib/types";
import { createMusicRights, deleteMusicRights, listMusicRights, updateMusicRights } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";
import { AdminCard, AdminModal, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Edit2, Trash2, Upload, X } from "lucide-react";

const BUCKET = "rights-logos";

export default function AdminMusicRightsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rights, setRights] = useState<MusicRights[]>([]);
  const [songs, setSongs] = useState<{ id: string; title: string; music_rights: string | null }[]>([]);
  const [albums, setAlbums] = useState<{ id: string; title: string; music_rights: string | null }[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MusicRights | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRight, setAssignRight] = useState<MusicRights | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [assignType, setAssignType] = useState<"songs" | "albums">("songs");

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [r, s, a] = await Promise.all([
        listMusicRights(),
        supabase.from("songs").select("id,title,music_rights").order("title"),
        supabase.from("albums").select("id,title,music_rights").order("title"),
      ]);
      setRights(r);
      setSongs((s.data ?? []) as typeof songs);
      setAlbums((a.data ?? []) as typeof albums);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load rights.");
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
    setDescription("");
    setLogoUrl("");
    setLogoFile(null);
  }

  function startEdit(r: MusicRights) {
    setEditing(r);
    setName(r.name);
    setDescription(r.description ?? "");
    setLogoUrl(r.logo_url ?? "");
    setLogoFile(null);
    setShowForm(true);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  async function uploadLogoIfAny(rightId?: number): Promise<{ logoUrl?: string; logoFilePath?: string }> {
    if (!logoFile) return {};
    const ext = logoFile.name.split(".").pop() || "png";
    const path = `logos/${rightId ?? crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, logoFile, { upsert: true });
    if (error) throw error;
    return { logoFilePath: path };
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      let logoPayload: { logoUrl?: string; logoFilePath?: string } = {};

      if (logoUrl.trim()) {
        logoPayload = { logoUrl: logoUrl.trim() };
      } else if (logoFile) {
        logoPayload = await uploadLogoIfAny(editing?.id);
      }

      if (editing && editing.id !== 0) {
        await updateMusicRights(editing.id, name, description, logoPayload.logoUrl, logoPayload.logoFilePath);
      } else {
        await createMusicRights(name, description, logoPayload.logoUrl, logoPayload.logoFilePath);
      }
      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this right?")) return;
    setErr(null);
    try {
      await deleteMusicRights(id);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  function openAssign(right: MusicRights, type: "songs" | "albums") {
    setAssignRight(right);
    setAssignType(type);
    setSelectedIds(new Set());
    setAssignModalOpen(true);
  }

  async function doAssign() {
    if (!assignRight || selectedIds.size === 0) return;
    setAssigning(true);
    setErr(null);
    try {
      const table = assignType === "songs" ? "songs" : "albums";
      for (const id of selectedIds) {
        const { error } = await supabase
          .from(table)
          .update({ music_rights: String(assignRight.id) })
          .eq("id", id);
        if (error) throw error;
      }
      setAssignModalOpen(false);
      setAssignRight(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to assign.");
    } finally {
      setAssigning(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const items = assignType === "songs" ? songs : albums;
    setSelectedIds(new Set(items.map((i) => i.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const items = assignType === "songs" ? songs : albums;

  return (
    <div>
      <Helmet>
        <title>Music Rights · Admin</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Music Rights</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage music rights and licensing information</p>
        </div>
        <AdminButton onClick={startCreate}>
          + New Right
        </AdminButton>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      {showForm && (
        <AdminCard title={editing ? "Edit Music Right" : "Create Music Right"}>
          <div className="space-y-4">
            <FormField label="Logo">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={logoFileRef}
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  className="flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-app hover:border-[var(--accent)] transition-colors"
                >
                  <Upload className="w-6 h-6 text-[var(--muted)]" />
                </button>
                {(logoFile || logoUrl) && (
                  <div className="relative">
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : logoUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoUrl(""); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Or paste logo URL"
                className="w-full mt-3 px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Right Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Right name (e.g., ASCAP, BMI, SESAC)"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Description">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormActions>
              <AdminButton onClick={save} disabled={saving || !name.trim()}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </AdminButton>
              <AdminButton variant="secondary" onClick={resetForm}>
                Cancel
              </AdminButton>
            </FormActions>
          </div>
        </AdminCard>
      )}

      {loading ? (
        <div className="py-8 text-center text-[var(--muted)]">Loading...</div>
      ) : rights.length === 0 && !showForm ? (
        <AdminCard title="Music Rights">
          <AdminEmpty title="No music rights defined yet" description="Create your first music right" />
        </AdminCard>
      ) : (
        <div className="mt-6 space-y-4">
          {rights.map((r) => (
            <AdminCard key={r.id} title={r.name}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {r.logo_url || r.logo_file_path ? (
                    <img
                      src={resolveImageSrc({ url: r.logo_url ?? undefined, filePath: r.logo_file_path ?? undefined, bucket: BUCKET })}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-lg font-bold text-[var(--muted)]">{r.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {r.description && <p className="text-sm text-[var(--muted)]">{r.description}</p>}
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => openAssign(r, "songs")}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Assign to Songs
                    </button>
                    <span className="text-[var(--muted)]">|</span>
                    <button
                      onClick={() => openAssign(r, "albums")}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Assign to Albums
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(r)}
                    className="p-2 rounded-lg bg-white/10 text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <AdminModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title={`Assign "${assignRight?.name}"`}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAssignType("songs")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                assignType === "songs" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              Songs ({songs.length})
            </button>
            <button
              onClick={() => setAssignType("albums")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                assignType === "albums" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              Albums ({albums.length})
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={selectAll} className="text-sm text-[var(--accent)] hover:underline">
              Select All
            </button>
            <button onClick={deselectAll} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
              Clear
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedIds.has(item.id) ? "bg-[var(--accent)]/20" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => {}}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                <span className="text-[var(--text)] truncate flex-1">{item.title}</span>
                {item.music_rights && (
                  <span className="text-xs text-[var(--muted)]">
                    ({rights.find((r) => r.id === Number(item.music_rights))?.name ?? item.music_rights})
                  </span>
                )}
              </div>
            ))}
          </div>

          <FormActions>
            <AdminButton onClick={doAssign} disabled={assigning || selectedIds.size === 0}>
              {assigning ? "Assigning..." : `Assign (${selectedIds.size})`}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </AdminButton>
          </FormActions>
        </div>
      </AdminModal>
    </div>
  );
}