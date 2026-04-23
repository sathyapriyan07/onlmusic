import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";
import { AdminCard, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Edit2, Trash2, Upload, Plus, X, Download, Search, Check, Music } from "lucide-react";

const BUCKET = "song-covers";

type Credit = { artist_id: string; role: string };

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string | null;
  releaseDate: string | null;
  trackTimeMillis: number | null;
  artworkUrl100: string | null;
  previewUrl: string | null;
}

type ImportSource = "itunes" | "musicbrainz" | "deezer";

export default function AdminSongsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [rights, setRights] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ItunesResult[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<number>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importSource, setImportSource] = useState<ImportSource>("itunes");

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [s, al, ar] = await Promise.all([listSongs(), listAlbums(), listArtists()]);
      setSongs(s);
      setAlbums(al);
      setArtists(ar);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load songs.");
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
    setTitle("");
    setAlbumId("");
    setYear("");
    setDuration("");
    setRights("");
    setCoverUrl("");
    setCoverFile(null);
    setPreviewUrl("");
    setPublished(true);
    setCredits([]);
  }

  async function loadSongArtists(songId: string) {
    const { data, error } = await supabase
      .from("song_artists")
      .select("artist_id,role")
      .eq("song_id", songId);
    if (error) throw error;
    setCredits((data ?? []).map((r) => ({ artist_id: r.artist_id as string, role: r.role as string })));
  }

  async function startEdit(s: Song) {
    setEditing(s);
    setTitle(s.title);
    setAlbumId(s.album_id ?? "");
    setYear(s.year ? String(s.year) : "");
    setDuration(s.duration ?? "");
    setRights(s.music_rights ?? "");
    setCoverUrl(s.cover_url ?? "");
    setCoverFile(null);
    setPreviewUrl(s.preview_url ?? "");
    setPublished(s.published ?? true);
    await loadSongArtists(s.id);
    setShowForm(true);
  }

  async function uploadIfAny(): Promise<string | null> {
    if (!coverFile) return editing?.cover_file_path ?? null;
    const ext = coverFile.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, coverFile, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const filePath = await uploadIfAny();
      const payload = {
        title: title.trim(),
        album_id: albumId || null,
        year: year ? Number(year) : null,
        duration: duration.trim() || null,
        music_rights: rights.trim() || null,
        cover_url: coverUrl.trim() || null,
        cover_file_path: coverUrl.trim() ? null : filePath,
        preview_url: previewUrl.trim() || null,
        published,
      };
      if (!payload.title) throw new Error("Title is required.");

      let songId = editing?.id ?? null;

      if (editing) {
        const { error } = await supabase.from("songs").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("songs").insert(payload).select("id").single();
        if (error) throw error;
        songId = (data as { id: string }).id;
      }

      if (!songId) throw new Error("Missing song id.");

      await supabase.from("song_artists").delete().eq("song_id", songId);
      const cleanCredits = credits
        .map((c) => ({ artist_id: c.artist_id, role: c.role.trim() }))
        .filter((c) => c.artist_id && c.role);
      if (cleanCredits.length) {
        const { error } = await supabase.from("song_artists").insert(
          cleanCredits.map((c) => ({
            song_id: songId,
            artist_id: c.artist_id,
            role: c.role,
          })),
        );
        if (error) throw error;
      }

      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save song.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this song?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete song.");
    }
  }

  const sortedAlbums = useMemo(() => [...albums].sort((a, b) => a.title.localeCompare(b.title)), [albums]);
  const sortedArtists = useMemo(() => [...artists].sort((a, b) => a.name.localeCompare(b.name)), [artists]);
  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function searchItunes(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=25`);
      const data = await resp.json();
      const results: ItunesResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        trackId: r.trackId as number,
        trackName: r.trackName as string,
        artistName: r.artistName as string,
        collectionName: r.collectionName as string | null,
        releaseDate: r.releaseDate as string | null,
        trackTimeMillis: r.trackTimeMillis as number | null,
        artworkUrl100: r.artworkUrl100 as string | null,
        previewUrl: r.previewUrl as string | null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search iTunes.");
    } finally {
      setImporting(false);
    }
  }

  async function searchMusicBrainz(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://musicbrainz.org/ws/2/recording?query=${term}&type=recording&limit=25&fmt=json`, {
        headers: { "User-Agent": "ONLMusic/1.0 (contact@onlmusic.dev)" },
      });
      const data = await resp.json();
      const results: ItunesResult[] = (data.recordings ?? []).map((r: Record<string, unknown>, i: number) => ({
        trackId: i,
        trackName: r.title as string,
        artistName: ((r.artist as Record<string, unknown>)?.name as string) || "Unknown",
        collectionName: null,
        releaseDate: null,
        trackTimeMillis: null,
        artworkUrl100: null,
        previewUrl: null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search MusicBrainz.");
    } finally {
      setImporting(false);
    }
  }

  async function searchDeezer(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://api.deezer.com/search/track?q=${term}&limit=25`);
      const data = await resp.json();
      const results: ItunesResult[] = (data.data ?? []).map((r: Record<string, unknown>) => ({
        trackId: r.id as number,
        trackName: r.title as string,
        artistName: (r.artist as Record<string, unknown>).name as string,
        collectionName: (r.album as Record<string, unknown>)?.title as string || null,
        releaseDate: (r.album as Record<string, unknown>)?.release_date as string || null,
        trackTimeMillis: (r.duration as number) * 1000,
        artworkUrl100: (r.album as Record<string, unknown>)?.cover_medium_url as string || (r.album as Record<string, unknown>)?.cover_small_url as string || null,
        previewUrl: r.preview as string || null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search Deezer.");
    } finally {
      setImporting(false);
    }
  }

  async function importFromItunes(r: ItunesResult) {
    const existingSong = songs.find(
      (s) => s.title.toLowerCase() === r.trackName.toLowerCase()
    );
    if (existingSong) {
      if (!confirm(`"${r.trackName}" already exists. Select anyway?`)) return;
      await startEdit(existingSong);
    } else {
      resetForm();
      setTitle(r.trackName);
      if (r.releaseDate) {
        setYear(r.releaseDate.slice(0, 4));
      }
      if (r.trackTimeMillis) {
        const mins = Math.floor(r.trackTimeMillis / 60000);
        const secs = Math.floor((r.trackTimeMillis % 60000) / 1000);
        setDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
      if (r.artworkUrl100) {
        setCoverUrl(r.artworkUrl100.replace("100x100", "600x600"));
      }
      if (r.previewUrl) {
        setPreviewUrl(r.previewUrl);
      }
    }
    setImportModalOpen(false);
  }

  async function bulkImportSelected() {
    if (selectedImportIds.size === 0) return;
    setBulkImporting(true);
    setErr(null);
    try {
      const toImport = importResults.filter((r) => selectedImportIds.has(r.trackId));
      const inserts: Array<{ title: string; year: number | null; duration: string | null; cover_url: string | null; preview_url: string | null; published: boolean }> = [];
      for (const r of toImport) {
        if (songs.some((s) => s.title.toLowerCase() === r.trackName.toLowerCase())) continue;
        inserts.push({
          title: r.trackName,
          year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null,
          duration: r.trackTimeMillis
            ? `${Math.floor(r.trackTimeMillis / 60000)}:${Math.floor((r.trackTimeMillis % 60000) / 1000).toString().padStart(2, "0")}`
            : null,
          cover_url: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "600x600") : null,
          preview_url: r.previewUrl ?? null,
          published: true,
        });
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from("songs").insert(inserts);
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

  function handleImportSearch() {
    if (importSource === "itunes") searchItunes(importQuery);
    else if (importSource === "musicbrainz") searchMusicBrainz(importQuery);
    else searchDeezer(importQuery);
  }

  const sourceLabels: Record<ImportSource, string> = {
    itunes: "iTunes",
    musicbrainz: "MusicBrainz",
    deezer: "Deezer",
  };

  return (
    <div>
      <Helmet>
        <title>Admin Songs · ONL Music Discovery</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Songs</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage your song catalog</p>
        </div>
        <div className="flex gap-2">
          <AdminButton variant="secondary" onClick={() => setImportModalOpen(true)}>
            <Download className="w-4 h-4 mr-2" /> Import
          </AdminButton>
          <AdminButton onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Song
          </AdminButton>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCard title={editing ? "Edit Song" : "Add New Song"}>
          <div className="space-y-4">
            <FormField label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Album">
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">No album</option>
                {sortedAlbums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Year">
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                />
              </FormField>
              <FormField label="Duration">
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 3:42"
                  className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                />
              </FormField>
            </div>

            <FormField label="Music Rights (optional)">
              <input
                value={rights}
                onChange={(e) => setRights(e.target.value)}
                placeholder="e.g. BMI, ASCAP"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Cover Image">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="cover-file"
                />
                <label
                  htmlFor="cover-file"
                  className="flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-app hover:border-[var(--accent)] transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-[var(--muted)]" />
                </label>
                {(coverFile || coverUrl || editing?.cover_url || editing?.cover_file_path) && (
                  <div className="relative">
                    <img
                      src={coverFile ? URL.createObjectURL(coverFile) : resolveImageSrc({ 
                        url: coverUrl || (editing?.cover_url ?? undefined), 
                        filePath: editing?.cover_file_path ?? undefined, 
                        bucket: BUCKET 
                      })}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverUrl(""); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="Or paste cover URL"
                className="w-full mt-3 px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Preview URL (optional)">
              <input
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="30-sec preview audio URL"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="published"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <label htmlFor="published" className="text-sm text-[var(--text)]">Published (show on site)</label>
            </div>

            <FormField label="Credits">
              <div className="space-y-2">
                {credits.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <select
                      value={c.artist_id}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCredits((prev) => prev.map((x, i) => (i === idx ? { ...x, artist_id: v } : x)));
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                    >
                      <option value="">Select artist</option>
                      {sortedArtists.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={c.role}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCredits((prev) => prev.map((x, i) => (i === idx ? { ...x, role: v } : x)));
                      }}
                      placeholder="Role (singer/composer/lyricist...)"
                      className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <AdminButton variant="danger" onClick={() => setCredits((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="w-4 h-4" />
                    </AdminButton>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCredits((prev) => [...prev, { artist_id: "", role: "" }])}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  + Add credit
                </button>
              </div>
            </FormField>

            <FormActions>
              <AdminButton onClick={save} disabled={saving || !title.trim()}>
                {saving ? "Saving..." : editing ? "Update Song" : "Add Song"}
              </AdminButton>
              {showForm && <AdminButton variant="secondary" onClick={resetForm}>Cancel</AdminButton>}
            </FormActions>
          </div>
        </AdminCard>

        <AdminCard 
          title={`Songs (${filteredSongs.length})`}
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
          ) : filteredSongs.length === 0 ? (
            <AdminEmpty title="No songs found" description="Add your first song to get started" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredSongs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden shrink-0">
                    {s.cover_url || s.cover_file_path ? (
                      <img
                        src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: BUCKET })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text)] truncate">{s.title}</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {[s.year ? String(s.year) : "", s.duration ?? ""].filter(Boolean).join(" · ") || "—"}
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

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] bg-[var(--surface)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-app">
              <h2 className="text-lg font-semibold text-[var(--text)]">Import from {sourceLabels[importSource]}</h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-app">
              <div className="flex gap-2 mb-3">
                {(["itunes", "musicbrainz", "deezer"] as ImportSource[]).map((source) => (
                  <button
                    key={source}
                    onClick={() => { setImportSource(source); setImportResults([]); setSelectedImportIds(new Set()); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      importSource === source
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--elevated)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    {sourceLabels[source]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    value={importQuery}
                    onChange={(e) => setImportQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImportSearch()}
                    placeholder={`Search on ${sourceLabels[importSource]}...`}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--elevated)] rounded-xl text-[var(--text)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
                <AdminButton onClick={handleImportSearch} disabled={importing || !importQuery.trim()}>
                  {importing ? "Searching..." : "Search"}
                </AdminButton>
              </div>
            </div>

            <div className="p-4 max-h-[400px] overflow-y-auto">
              {importing ? (
                <div className="py-8 text-center text-[var(--muted)]">Searching...</div>
              ) : importResults.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted)]">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Search for songs to import</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importResults.map((r) => {
                    const isSelected = selectedImportIds.has(r.trackId);
                    const exists = songs.some((s) => s.title.toLowerCase() === r.trackName.toLowerCase());
                    return (
                      <div
                        key={r.trackId}
                        className={`flex items-center gap-3 p-3 rounded-xl transition ${
                          exists
                            ? "opacity-50"
                            : isSelected
                            ? "bg-[var(--accent)]/10"
                            : "bg-[var(--elevated)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        <button
                          onClick={() => !exists && toggleImportSelect(r.trackId)}
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
                        <div className="w-12 h-12 rounded-lg bg-[var(--hover)] overflow-hidden shrink-0">
                          {r.artworkUrl100 && (
                            <img src={r.artworkUrl100} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text)] truncate">{r.trackName}</p>
                          <p className="text-xs text-[var(--muted)] truncate">
                            {r.artistName}
                            {r.collectionName && ` · ${r.collectionName}`}
                          </p>
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
                    {bulkImporting ? "Importing..." : `Import ${selectedImportIds.size} Songs`}
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