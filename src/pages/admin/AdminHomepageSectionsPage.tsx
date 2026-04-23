import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, HomepageSection, HomepageSectionType, Song } from "../../lib/types";
import { listAlbums, listArtists, listHomepageSections, listSongs } from "../../lib/db";
import { AdminCard, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Edit2, Trash2 } from "lucide-react";

type ItemOption = { id: string; label: string };

export default function AdminHomepageSectionsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<HomepageSectionType>("songs");
  const [order, setOrder] = useState<string>("0");
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [secs, s, al, ar] = await Promise.all([listHomepageSections(), listSongs(), listAlbums(), listArtists()]);
      setSections(secs);
      setSongs(s);
      setAlbums(al);
      setArtists(ar);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load sections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const options = useMemo((): ItemOption[] => {
    if (type === "songs") return songs.map((s) => ({ id: s.id, label: s.title }));
    if (type === "albums") return albums.map((a) => ({ id: a.id, label: a.title }));
    return artists.map((a) => ({ id: a.id, label: a.name }));
  }, [type, songs, albums, artists]);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setType("songs");
    setOrder("0");
    setItems([]);
  }

  function startEdit(s: HomepageSection) {
    setEditing(s);
    setTitle(s.title);
    setType(s.type);
    setOrder(String(s.order ?? 0));
    setItems(s.items ?? []);
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        title: title.trim(),
        type,
        order: Number(order || "0"),
        items,
      };
      if (!payload.title) throw new Error("Title is required.");

      if (editing) {
        const { error } = await supabase.from("homepage_sections").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_sections").insert(payload);
        if (error) throw error;
      }

      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save section.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this section?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete section.");
    }
  }

  return (
    <div>
      <Helmet>
        <title>Admin Homepage · ONL Music Discovery</title>
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Homepage Sections</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Create YouTube Music-style horizontal carousels on the homepage</p>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCard title={editing ? "Edit Section" : "Create Section"}>
          <div className="space-y-4">
            <FormField label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (Trending Songs, Popular Albums…)"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Type">
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value as HomepageSectionType); setItems([]); }}
                  className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="songs">Songs</option>
                  <option value="albums">Albums</option>
                  <option value="artists">Artists</option>
                </select>
              </FormField>
              <FormField label="Order">
                <input
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  placeholder="Order (0..)"
                  className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                />
              </FormField>
            </div>

            <FormField label="Items">
              <div className="space-y-3">
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    setItems((prev) => (prev.includes(v) ? prev : [...prev, v]));
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">Add item…</option>
                  {options.sort((a, b) => a.label.localeCompare(b.label)).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <div className="space-y-2">
                  {items.map((id) => {
                    const label = options.find((o) => o.id === id)?.label ?? id;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5"
                      >
                        <div className="min-w-0 truncate text-sm text-[var(--text)]">{label}</div>
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((x) => x !== id))}
                          className="shrink-0 px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  {items.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">Add items to include in the carousel</p>
                  ) : null}
                </div>
              </div>
            </FormField>

            <FormActions>
              <AdminButton onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Section"}
              </AdminButton>
              {editing && (
                <AdminButton variant="secondary" onClick={resetForm}>
                  Cancel
                </AdminButton>
              )}
            </FormActions>
          </div>
        </AdminCard>

        <AdminCard title={`Sections (${sections.length})`}>
          {loading ? (
            <div className="py-8 text-center text-[var(--muted)]">Loading…</div>
          ) : sections.length === 0 ? (
            <AdminEmpty title="No sections yet" description="Create your first homepage section" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {sections.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text)] truncate">{s.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {s.type} · order {s.order} · {s.items?.length ?? 0} items
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-2 rounded-lg bg-white/10 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => del(s.id)}
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