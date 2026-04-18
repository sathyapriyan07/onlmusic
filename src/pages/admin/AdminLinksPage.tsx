import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Link, LinkEntityType, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";

type EntityOption = { type: LinkEntityType; id: string; label: string };

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
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [l, s, al, ar] = await Promise.all([
        supabase.from("links").select("id,entity_type,entity_id,platform,url,created_at").order("id", { ascending: false }),
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

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Links · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-6">
        <h1 className="text-lg font-semibold text-white">Links</h1>
        <p className="mt-1 text-sm text-muted">Manage external links (YouTube, Spotify, Apple Music, YouTube Music, etc.).</p>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-white">Create link</div>
            <div className="mt-3 space-y-3">
              <select value={entityType} onChange={(e) => { setEntityType(e.target.value as LinkEntityType); setEntityId(""); }} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="song">Song</option>
                <option value="album">Album</option>
                <option value="artist">Artist</option>
              </select>

              <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="">Select…</option>
                {entities.sort((a, b) => a.label.localeCompare(b.label)).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>

              <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Platform (YouTube, Spotify…)" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="w-full rounded-lg border border-app bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" />

              <button type="button" disabled={saving} onClick={save} className="btn-primary rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-app bg-panel2 p-4">
            <div className="text-sm font-semibold text-white">Existing</div>
            {loading ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : (
              <div className="mt-3 max-h-[520px] space-y-2 overflow-x-auto">
                {links.map((l) => (
                  <div key={l.id} className="rounded-lg border border-app bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="text-xs text-muted">
                          {l.entity_type} · {l.platform}
                        </div>
                        <div className="truncate text-sm text-white">{l.url}</div>
                      </div>
                      <button type="button" onClick={() => del(l.id)} className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
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
    </div>
  );
}
