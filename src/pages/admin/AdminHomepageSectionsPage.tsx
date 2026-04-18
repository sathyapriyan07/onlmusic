import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, HomepageSection, HomepageSectionType, Song } from "../../lib/types";
import { listAlbums, listArtists, listHomepageSections, listSongs } from "../../lib/db";

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
    <div className="space-y-4">
      <Helmet>
        <title>Admin Homepage · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-6">
        <h1 className="text-lg font-semibold text-white">Homepage sections</h1>
        <p className="mt-1 text-sm text-muted">Create YouTube Music-style horizontal carousels on the homepage.</p>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-white">{editing ? "Edit section" : "Create section"}</div>
            <div className="mt-3 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (Trending Songs, Popular Albums…)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />

              <div className="grid grid-cols-2 gap-2">
                <select value={type} onChange={(e) => { setType(e.target.value as HomepageSectionType); setItems([]); }} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none">
                  <option value="songs">Songs</option>
                  <option value="albums">Albums</option>
                  <option value="artists">Artists</option>
                </select>
                <input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="Order (0..)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              </div>

              <div className="rounded-lg border border-app bg-black/20 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Items</div>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    setItems((prev) => (prev.includes(v) ? prev : [...prev, v]));
                  }}
                  className="w-full rounded-lg border border-app bg-black/30 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">Add item…</option>
                  {options.sort((a, b) => a.label.localeCompare(b.label)).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <div className="mt-3 space-y-2">
                  {items.map((id) => {
                    const label = options.find((o) => o.id === id)?.label ?? id;
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-app bg-black/20 px-3 py-2 text-sm">
                        <div className="min-w-0 truncate text-white">{label}</div>
                        <button type="button" onClick={() => setItems((prev) => prev.filter((x) => x !== id))} className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  {items.length === 0 ? <div className="text-sm text-muted">Add items to include in the carousel.</div> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
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
                {sections.map((s) => (
                  <div key={s.id} className="rounded-lg border border-app bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{s.title}</div>
                        <div className="mt-1 text-xs text-muted">
                          {s.type} · order {s.order} · {s.items?.length ?? 0} items
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => startEdit(s)} className="rounded-xl border border-app bg-panel2 px-3 py-2 text-xs text-white hover:bg-white/10">
                          Edit
                        </button>
                        <button type="button" onClick={() => del(s.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {sections.length === 0 ? <div className="text-sm text-muted">No sections yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
