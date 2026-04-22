import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { MusicRights } from "../../lib/types";
import { createMusicRights, deleteMusicRights, listMusicRights, updateMusicRights } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";

const BUCKET = "rights-logos";

export default function AdminMusicRightsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rights, setRights] = useState<MusicRights[]>([]);
  const [songs, setSongs] = useState<{ id: string; title: string; music_rights: string | null }[]>([]);
  const [albums, setAlbums] = useState<{ id: string; title: string; music_rights: string | null }[]>([]);

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
    setEditing(null);
    setName("");
    setDescription("");
    setLogoUrl("");
    setLogoFile(null);
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

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Music Rights</h1>
        <button
          onClick={() => { resetForm(); setEditing({ id: 0, name: "", description: null, logo_url: null, logo_file_path: null, created_at: "" }); }}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
        >
          + New Right
        </button>
      </div>

      {err && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>}

      {editing?.id === 0 && (
        <div className="mb-6 rounded-xl border border-app bg-panel p-4">
          <h2 className="mb-3 text-lg font-semibold">Create Music Right</h2>
          <div className="space-y-3">
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
                className="h-16 w-16 rounded-lg border border-app bg-panel2 flex items-center justify-center text-xs text-muted hover:border-[var(--accent)]"
              >
                + Logo
              </button>
              {logoFile && (
                <div className="flex items-center gap-2">
                  <img src={URL.createObjectURL(logoFile)} alt="" className="h-16 w-16 rounded-lg object-contain" />
                  <span className="text-xs text-muted truncate max-w-24">{logoFile.name}</span>
                </div>
              )}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Right name (e.g., ASCAP, BMI, SESAC)"
              className="w-full rounded-lg border border-app bg-panel2 px-4 py-2 text-sm outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-app bg-panel2 px-4 py-2 text-sm outline-none"
            />
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Or paste logo URL"
              className="w-full rounded-lg border border-app bg-panel2 px-4 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create"}
              </button>
              <button onClick={resetForm} className="rounded-full border border-app bg-panel2 px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : rights.length === 0 ? (
        <div className="rounded-xl border border-app bg-panel p-6 text-center text-muted">
          No music rights defined yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rights.map((r) => (
            <div key={r.id} className="rounded-xl border border-app bg-panel p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-panel2 flex items-center justify-center overflow-hidden shrink-0">
                  {r.logo_url || r.logo_file_path ? (
                    <img 
                      src={resolveImageSrc({ url: r.logo_url ?? undefined, filePath: r.logo_file_path ?? undefined, bucket: BUCKET })} 
                      alt="" 
                      className="h-full w-full object-contain" 
                    />
                  ) : (
                    <span className="text-lg font-bold text-muted">{r.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.name}</div>
                  {r.description && <div className="text-xs text-muted mt-1">{r.description}</div>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => openAssign(r, "songs")}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Assign to Songs
                    </button>
                    <span className="text-dimmer">|</span>
                    <button
                      onClick={() => openAssign(r, "albums")}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Assign to Albums
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(r);
                      setName(r.name);
                      setDescription(r.description ?? "");
                      setLogoUrl(r.logo_url ?? "");
                      setLogoFile(null);
                    }}
                    className="text-xs text-muted hover:text-[var(--text)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editing?.id === r.id && (
                <div className="mt-4 space-y-3 border-t border-app pt-4">
                  <h3 className="text-sm font-semibold">Edit: {r.name}</h3>
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
                      className="h-16 w-16 rounded-lg border border-app bg-panel2 flex items-center justify-center text-xs text-muted hover:border-[var(--accent)]"
                    >
                      Change
                    </button>
                    {r.logo_url || r.logo_file_path ? (
                      <img 
                        src={resolveImageSrc({ url: r.logo_url ?? undefined, filePath: r.logo_file_path ?? undefined, bucket: BUCKET })} 
                        alt="" 
                        className="h-16 w-16 rounded-lg object-contain" 
                      />
                    ) : null}
                    {logoFile && (
                      <div className="flex items-center gap-2">
                        <img src={URL.createObjectURL(logoFile)} alt="" className="h-16 w-16 rounded-lg object-contain" />
                        <span className="text-xs text-muted">{logoFile.name}</span>
                      </div>
                    )}
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-app bg-panel2 px-4 py-2 text-sm outline-none"
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full rounded-lg border border-app bg-panel2 px-4 py-2 text-sm outline-none"
                  />
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Or paste logo URL"
                    className="w-full rounded-lg border border-app bg-panel2 px-4 py-2 text-sm outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={save}
                      disabled={saving || !name.trim()}
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Update"}
                    </button>
                    <button onClick={resetForm} className="rounded-full border border-app bg-panel2 px-4 py-2 text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {assignModalOpen && assignRight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-app bg-panel p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assign "{assignRight.name}"</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-muted hover:text-[var(--text)]">
                ✕
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setAssignType("songs")}
                className={`rounded-full px-3 py-1 text-xs ${assignType === "songs" ? "bg-[var(--accent)] text-black" : "border border-app"}`}
              >
                Songs ({songs.length})
              </button>
              <button
                onClick={() => setAssignType("albums")}
                className={`rounded-full px-3 py-1 text-xs ${assignType === "albums" ? "bg-[var(--accent)] text-black" : "border border-app"}`}
              >
                Albums ({albums.length})
              </button>
            </div>

            <div className="mb-2 flex gap-2">
              <button onClick={selectAll} className="text-xs text-[var(--accent)] hover:underline">
                Select All
              </button>
              <button onClick={deselectAll} className="text-xs text-muted hover:text-[var(--text)]">
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer ${
                    selectedIds.has(item.id) ? "bg-[var(--accent)]/20" : "hover:bg-panel2"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  {item.music_rights && (
                    <span className="text-xs text-muted">
                      ({rights.find((r) => r.id === Number(item.music_rights))?.name ?? item.music_rights})
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={doAssign}
                disabled={assigning || selectedIds.size === 0}
                className="flex-1 rounded-full bg-[var(--accent)] py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {assigning ? "Assigning..." : `Assign (${selectedIds.size})`}
              </button>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="rounded-full border border-app px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}