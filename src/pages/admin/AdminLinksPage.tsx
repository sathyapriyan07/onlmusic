import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Link, LinkCategory, LinkEntityType, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";
import { AdminCard, AdminModal, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Trash2 } from "lucide-react";

type EntityOption = { type: LinkEntityType; id: string; label: string };

type BulkLink = { platform: string; url: string; category: LinkCategory };

export default function AdminLinksPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [entityType, setEntityType] = useState<LinkEntityType>("song");
  const [entityId, setEntityId] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<LinkCategory>("official");
  const [saving, setSaving] = useState(false);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkEntityType, setBulkEntityType] = useState<LinkEntityType>("song");
  const [bulkEntityId, setBulkEntityId] = useState("");
  const [bulkLinks, setBulkLinks] = useState<BulkLink[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [l, s, al, ar] = await Promise.all([
        supabase.from("links").select("id,entity_type,entity_id,platform,url,category,created_at").order("id", { ascending: false }),
        listSongs(),
        listAlbums(),
        listArtists(),
      ]);
      if (l.error) throw l.error;
      setLinks((l.data ?? []) as Link[]);
      setSongs(s);
      setAlbums(al);
      setArtists(ar);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load links.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const entities = useMemo((): EntityOption[] => {
    if (entityType === "song") return songs.map((s) => ({ type: "song", id: s.id, label: s.title }));
    if (entityType === "album") return albums.map((a) => ({ type: "album", id: a.id, label: a.title }));
    return artists.map((a) => ({ type: "artist", id: a.id, label: a.name }));
  }, [entityType, songs, albums, artists]);

  const bulkEntities = useMemo((): EntityOption[] => {
    if (bulkEntityType === "song") return songs.map((s) => ({ type: "song", id: s.id, label: s.title }));
    if (bulkEntityType === "album") return albums.map((a) => ({ type: "album", id: a.id, label: a.title }));
    return artists.map((a) => ({ type: "artist", id: a.id, label: a.name }));
  }, [bulkEntityType, songs, albums, artists]);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      if (!entityId) throw new Error("Pick an entity.");
      if (!platform.trim()) throw new Error("Platform is required.");
      if (!url.trim()) throw new Error("URL is required.");

      const { error } = await supabase.from("links").insert({
        entity_type: entityType,
        entity_id: entityId,
        platform: platform.trim(),
        url: url.trim(),
        category,
      });
      if (error) throw error;
      setUrl("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create link.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this link?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("links").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete link.");
    }
  }

  function addBulkLinkRow() {
    setBulkLinks([...bulkLinks, { platform: "YouTube", url: "", category: "official" }]);
  }

  function updateBulkLinkRow(index: number, field: keyof BulkLink, value: string) {
    setBulkLinks(bulkLinks.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function removeBulkLinkRow(index: number) {
    setBulkLinks(bulkLinks.filter((_, i) => i !== index));
  }

  async function saveBulkLinks() {
    if (!bulkEntityId || bulkLinks.length === 0) return;
    setBulkSaving(true);
    setErr(null);
    try {
      const validLinks = bulkLinks.filter((l) => l.url.trim());
      if (validLinks.length === 0) throw new Error("At least one URL is required.");
      const inserts = validLinks.map((l) => ({
        entity_type: bulkEntityType,
        entity_id: bulkEntityId,
        platform: l.platform.trim(),
        url: l.url.trim(),
        category: l.category,
      }));
      const { error } = await supabase.from("links").insert(inserts);
      if (error) throw error;
      setBulkModalOpen(false);
      setBulkLinks([]);
      setBulkEntityId("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save links.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div>
      <Helmet>
        <title>Admin Links · ONL Music Discovery</title>
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Links</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Manage external links (YouTube, Spotify, Apple Music, YouTube Music, etc.)</p>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCard title="Create Link">
          <div className="space-y-4">
            <FormField label="Entity Type">
              <select
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value as LinkEntityType); setEntityId(""); }}
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="song">Song</option>
                <option value="album">Album</option>
                <option value="artist">Artist</option>
              </select>
            </FormField>

            <FormField label="Select Entity">
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Select…</option>
                {entities.sort((a, b) => a.label.localeCompare(b.label)).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Platform">
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Platform (YouTube, Spotify…)"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="URL">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LinkCategory)}
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="official">Official</option>
                <option value="live">Live Performance</option>
                <option value="lyrics">Lyric Video</option>
                <option value="covers">Covers</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormActions>
              <AdminButton onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Create Link"}
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setBulkModalOpen(true)}>Bulk Add</AdminButton>
            </FormActions>
          </div>
        </AdminCard>

        <AdminCard title={`Links (${links.length})`}>
          {loading ? (
            <div className="py-8 text-center text-[var(--muted)]">Loading…</div>
          ) : links.length === 0 ? (
            <AdminEmpty title="No links yet" description="Create your first link" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {links.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--muted)]">
                      {l.entity_type} · {l.platform}
                    </p>
                    <p className="text-sm text-[var(--text)] truncate">{l.url}</p>
                  </div>
                  <button
                    onClick={() => del(l.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      <AdminModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Bulk Add Links">
        <div className="space-y-4">
          <FormField label="Entity Type">
            <select
              value={bulkEntityType}
              onChange={(e) => { setBulkEntityType(e.target.value as LinkEntityType); setBulkEntityId(""); }}
              className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="song">Song</option>
              <option value="album">Album</option>
              <option value="artist">Artist</option>
            </select>
          </FormField>

          <FormField label="Select Entity">
            <select
              value={bulkEntityId}
              onChange={(e) => setBulkEntityId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Select {bulkEntityType}...</option>
              {bulkEntities.sort((a, b) => a.label.localeCompare(b.label)).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {bulkLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-start">
                <select
                  value={link.category}
                  onChange={(e) => updateBulkLinkRow(i, "category", e.target.value)}
                  className="w-24 px-3 py-2 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="official">Official</option>
                  <option value="live">Live</option>
                  <option value="lyrics">Lyrics</option>
                  <option value="covers">Covers</option>
                  <option value="other">Other</option>
                </select>
                <input
                  value={link.platform}
                  onChange={(e) => updateBulkLinkRow(i, "platform", e.target.value)}
                  placeholder="Platform"
                  className="flex-1 px-3 py-2 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                />
                <input
                  value={link.url}
                  onChange={(e) => updateBulkLinkRow(i, "url", e.target.value)}
                  placeholder="URL"
                  className="flex-1 px-3 py-2 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeBulkLinkRow(i)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addBulkLinkRow} className="text-sm text-[var(--accent)] hover:underline">
            + Add Link
          </button>

          <FormActions>
            <AdminButton onClick={saveBulkLinks} disabled={!bulkEntityId || bulkLinks.length === 0 || bulkSaving}>
              {bulkSaving ? "Saving..." : "Save All Links"}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setBulkModalOpen(false)}>Cancel</AdminButton>
          </FormActions>
        </div>
      </AdminModal>
    </div>
  );
}