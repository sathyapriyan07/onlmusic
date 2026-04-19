import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Link, LinkCategory, LinkEntityType, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";

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
    <div className="space-y-4 overflow-x-hidden [overflow-wrap:balance]">
      <Helmet>
        <title>Admin Links · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-4 sm:p-6">
        <h1 className="text-lg font-semibold text-[var(--text)]">Links</h1>
        <p className="mt-1 text-sm text-muted">Manage external links (YouTube, Spotify, Apple Music, YouTube Music, etc.).</p>
        <button type="button" onClick={() => setBulkModalOpen(true)} className="mt-3 btn-secondary rounded-xl px-4 py-2 text-sm text-[var(--text)]">
          Bulk Add Links
        </button>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-3 sm:p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Create link</div>
            <div className="mt-3 space-y-3">
              <select value={entityType} onChange={(e) => { setEntityType(e.target.value as LinkEntityType); setEntityId(""); }} className="w-full rounded-lg border border-app bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none">
                <option value="song">Song</option>
                <option value="album">Album</option>
                <option value="artist">Artist</option>
              </select>

              <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="w-full rounded-lg border border-app bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none">
                <option value="">Select…</option>
                {entities.sort((a, b) => a.label.localeCompare(b.label)).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>

              <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Platform (YouTube, Spotify…)" className="w-full rounded-lg border border-app bg-input px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="w-full rounded-lg border border-app bg-input px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none" />
              
              <select value={category} onChange={(e) => setCategory(e.target.value as LinkCategory)} className="w-full rounded-lg border border-app bg-input px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none">
                <option value="official">Official</option>
                <option value="live">Live Performance</option>
                <option value="lyrics">Lyric Video</option>
                <option value="covers">Covers</option>
                <option value="other">Other</option>
              </select>

              <button type="button" disabled={saving} onClick={save} className="btn-primary rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-app bg-panel2 p-3 sm:p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Existing</div>
            {loading ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : (
              <div className="mt-3 max-h-[400px] sm:max-h-[520px] space-y-2 overflow-auto">
                {links.map((l) => (
                  <div key={l.id} className="rounded-lg border border-app bg-black/20 p-2.5 sm:p-3">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted truncate">
                          {l.entity_type} · {l.platform}
                        </div>
                        <div className="truncate text-sm text-[var(--text)]">{l.url}</div>
                      </div>
                      <button type="button" onClick={() => del(l.id)} className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 sm:px-3 sm:py-2 text-xs text-red-200 hover:bg-red-500/20">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {links.length === 0 ? <div className="text-sm text-muted">No links yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-2 sm:p-4 overflow-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-app bg-panel p-4 my-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Bulk Add Links</h2>
              <button type="button" onClick={() => setBulkModalOpen(false)} className="text-muted hover:text-[var(--text)]">✕</button>
            </div>
            <div className="space-y-3">
              <select value={bulkEntityType} onChange={(e) => { setBulkEntityType(e.target.value as LinkEntityType); setBulkEntityId(""); }} className="w-full rounded-lg border border-app bg-input px-3 py-2.5 text-sm text-[var(--text)] outline-none">
                <option value="song">Song</option>
                <option value="album">Album</option>
                <option value="artist">Artist</option>
              </select>
              <select value={bulkEntityId} onChange={(e) => setBulkEntityId(e.target.value)} className="w-full rounded-lg border border-app bg-input px-3 py-2.5 text-sm text-[var(--text)] outline-none">
                <option value="">Select {bulkEntityType}...</option>
                {bulkEntities.sort((a, b) => a.label.localeCompare(b.label)).map((e) => (<option key={e.id} value={e.id}>{e.label}</option>))}
              </select>
              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-auto">
                {bulkLinks.map((link, i) => (
                  <div key={i} className="flex gap-1.5 sm:gap-2 items-start">
                    <select value={link.category} onChange={(e) => updateBulkLinkRow(i, "category", e.target.value)} className="w-20 sm:w-24 rounded-lg border border-app bg-input px-1.5 sm:px-2 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text)] outline-none">
                      <option value="official">Official</option>
                      <option value="live">Live</option>
                      <option value="lyrics">Lyrics</option>
                      <option value="covers">Covers</option>
                      <option value="other">Other</option>
                    </select>
                    <input value={link.platform} onChange={(e) => updateBulkLinkRow(i, "platform", e.target.value)} placeholder="Platform" className="flex-1 min-w-0 rounded-lg border border-app bg-input px-2 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text)] outline-none" />
                    <input value={link.url} onChange={(e) => updateBulkLinkRow(i, "url", e.target.value)} placeholder="URL" className="flex-1 min-w-0 rounded-lg border border-app bg-input px-2 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text)] outline-none" />
                    <button type="button" onClick={() => removeBulkLinkRow(i)} className="shrink-0 text-red-400 hover:text-red-300 p-1.5 sm:p-2">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBulkLinkRow} className="text-sm text-[var(--accent)] hover:underline">+ Add Link</button>
              <div className="flex gap-2 pt-2">
                <button type="button" disabled={!bulkEntityId || bulkLinks.length === 0 || bulkSaving} onClick={saveBulkLinks} className="btn-primary rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-semibold disabled:opacity-50">
                  {bulkSaving ? "Saving..." : "Save All Links"}
                </button>
                <button type="button" onClick={() => setBulkModalOpen(false)} className="btn-secondary rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
