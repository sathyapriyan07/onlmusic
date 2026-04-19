import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";

const BUCKET = "album-covers";

interface ItunesCollection {
  collectionId: number;
  collectionName: string;
  artistName: string;
  releaseDate: string | null;
  artworkUrl100: string | null;
}

export default function AdminAlbumsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [editing, setEditing] = useState<Album | null>(null);
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ItunesCollection[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<number>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importSource, setImportSource] = useState<"itunes" | "deezer">("itunes");

  const [assignSongsModalOpen, setAssignSongsModalOpen] = useState(false);
  const [assigningAlbum, setAssigningAlbum] = useState<Album | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [assigningSongs, setAssigningSongs] = useState(false);

  async function doSearch() {
    if (importSource === "itunes") await searchItunes(importQuery);
    else await searchDeezer(importQuery);
  }

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [a, ar, s] = await Promise.all([listAlbums(), listArtists(), listSongs()]);
      setAlbums(a);
      setArtists(ar);
      setAllSongs(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load albums.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setReleaseYear("");
    setCoverUrl("");
    setCoverFile(null);
    setArtistIds([]);
  }

  async function loadAlbumArtists(albumId: string) {
    const { data, error } = await supabase
      .from("album_artists")
      .select("artist_id")
      .eq("album_id", albumId);
    if (error) throw error;
    setArtistIds((data ?? []).map((r) => r.artist_id as string));
  }

  async function startEdit(a: Album) {
    setEditing(a);
    setTitle(a.title);
    setReleaseYear(a.release_year ? String(a.release_year) : "");
    setCoverUrl(a.cover_url ?? "");
    setCoverFile(null);
    await loadAlbumArtists(a.id);
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
        release_year: releaseYear ? Number(releaseYear) : null,
        cover_url: coverUrl.trim() || null,
        cover_file_path: coverUrl.trim() ? null : filePath,
      };
      if (!payload.title) throw new Error("Title is required.");

      let albumId = editing?.id ?? null;

      if (editing) {
        const { error } = await supabase.from("albums").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("albums").insert(payload).select("id").single();
        if (error) throw error;
        albumId = (data as { id: string }).id;
      }

      if (!albumId) throw new Error("Missing album id.");

      // Replace album artists junction
      await supabase.from("album_artists").delete().eq("album_id", albumId);
      if (artistIds.length) {
        const { error } = await supabase.from("album_artists").insert(
          artistIds.map((artistId) => ({
            album_id: albumId,
            artist_id: artistId,
          })),
        );
        if (error) throw error;
      }

      resetForm();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save album.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this album?")) return;
    setErr(null);
    try {
      const { error } = await supabase.from("albums").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete album.");
    }
  }

  function openAssignSongs(album: Album) {
    setAssigningAlbum(album);
    setSelectedSongIds(new Set());
    setAssignSongsModalOpen(true);
  }

  async function assignSongsToAlbum() {
    if (!assigningAlbum || selectedSongIds.size === 0) return;
    setAssigningSongs(true);
    setErr(null);
    try {
      for (const songId of selectedSongIds) {
        const { error } = await supabase.from("songs").update({ album_id: assigningAlbum.id }).eq("id", songId);
        if (error) throw error;
      }
      setAssignSongsModalOpen(false);
      setAssigningAlbum(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to assign songs.");
    } finally {
      setAssigningSongs(false);
    }
  }

  function toggleSongSelection(id: string) {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllSongs(songList: Song[]) {
    setSelectedSongIds(new Set(songList.map((s) => s.id)));
  }

  function deselectAllSongs() {
    setSelectedSongIds(new Set());
  }

  async function searchItunes(q: string) {
    if (!q.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=25`);
      const data = await resp.json();
      const results: ItunesCollection[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        collectionId: r.collectionId as number,
        collectionName: r.collectionName as string,
        artistName: r.artistName as string,
        releaseDate: r.releaseDate as string | null,
        artworkUrl100: r.artworkUrl100 as string | null,
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
    try {
      const term = encodeURIComponent(q.trim());
      const resp = await fetch(`https://api.deezer.com/search/album?q=${term}&limit=25`);
      const data = await resp.json();
      const results: ItunesCollection[] = (data.data ?? []).map((r: Record<string, unknown>) => ({
        collectionId: r.id as number,
        collectionName: r.title as string,
        artistName: (r.artist as Record<string, unknown>).name as string,
        releaseDate: (r.release_date as string) || null,
        artworkUrl100: r.cover_medium as string || r.cover_small as string || null,
      }));
      setImportResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to search Deezer.");
    } finally {
      setImporting(false);
    }
  }

  function importFromItunes(r: ItunesCollection) {
    const existingAlbum = albums.find(
      (a) => a.title.toLowerCase() === r.collectionName.toLowerCase()
    );
    if (existingAlbum) {
      if (!confirm(`"${r.collectionName}" already exists. Select anyway?`)) return;
      startEdit(existingAlbum);
    } else {
      resetForm();
      setTitle(r.collectionName);
      if (r.releaseDate) {
        setReleaseYear(r.releaseDate.slice(0, 4));
      }
      if (r.artworkUrl100) {
        setCoverUrl(r.artworkUrl100.replace("100x100", "600x600"));
      }
    }
    setImportModalOpen(false);
  }

  async function bulkImportSelected() {
    if (selectedImportIds.size === 0) return;
    setBulkImporting(true);
    setErr(null);
    try {
      const toImport = importResults.filter((r) => selectedImportIds.has(r.collectionId));
      const inserts: Array<{ title: string; release_year: number | null; cover_url: string | null; published: boolean }> = [];
      for (const r of toImport) {
        if (albums.some((a) => a.title.toLowerCase() === r.collectionName.toLowerCase())) continue;
        inserts.push({
          title: r.collectionName,
          release_year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null,
          cover_url: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "600x600") : null,
          published: true,
        });
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from("albums").insert(inserts);
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

  function selectAll() {
    setSelectedImportIds(new Set(importResults.map((r) => r.collectionId)));
  }

  function deselectAll() {
    setSelectedImportIds(new Set());
  }

  const sortedArtists = useMemo(() => [...artists].sort((a, b) => a.name.localeCompare(b.name)), [artists]);

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Albums · ONL Music Discovery</title>
      </Helmet>

      <div className="rounded-xl border border-app bg-panel p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">Albums</h1>
            <p className="mt-1 text-sm text-muted">CRUD albums and assign multiple artists.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setImportSource("itunes"); setImportModalOpen(true); }} className="btn-secondary rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm text-[var(--text)] hover:bg-white/10">
              iTunes
            </button>
            <button type="button" onClick={() => { setImportSource("deezer"); setImportModalOpen(true); }} className="btn-secondary rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm text-[var(--text)] hover:bg-white/10">
              Deezer
            </button>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-app bg-panel2 px-4 py-3 text-sm text-[var(--text)] hover:bg-white/10">
              New album
            </button>
          </div>
        </div>

        {err ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-app bg-panel2 p-3 sm:p-4">
            <div className="text-sm font-semibold text-[var(--text)]">{editing ? "Edit album" : "Create album"}</div>
            <div className="mt-3 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-app bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none" />
              <input value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Release year (optional)" className="w-full rounded-lg border border-app bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none" />
              <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Cover URL (optional)" className="w-full rounded-lg border border-app bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] outline-none" />
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-app bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-[var(--text)] file:mr-2 file:rounded-full file:border-0 file:bg-white file:px-2 file:py-1.5 sm:file:px-3 sm:file:py-2 file:text-xs sm:file:text-sm file:font-semibold file:text-black" />

              <div className="rounded-lg border border-app bg-black/20 p-2.5 sm:p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Album artists</div>
                <div className="max-h-32 sm:max-h-44 space-y-2 overflow-auto pr-1">
                  {sortedArtists.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-[var(--text)]">
                      <input
                        type="checkbox"
                        checked={artistIds.includes(a.id)}
                        onChange={(e) => {
                          setArtistIds((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)));
                        }}
                      />
                      <span className="truncate">{a.name}</span>
                    </label>
                  ))}
                  {sortedArtists.length === 0 ? <div className="text-sm text-muted">Create artists first.</div> : null}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={save} className="btn-primary rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                {editing ? (
                  <button type="button" onClick={resetForm} className="rounded-full bg-black/30 px-4 py-3 text-sm text-[var(--text)] hover:bg-black/40">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-app bg-panel2 p-3 sm:p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Existing</div>
            {loading ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : (
              <div className="mt-3 max-h-[400px] sm:max-h-[520px] space-y-2 overflow-auto pr-2">
                {albums.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-app bg-black/20 px-2.5 py-2 sm:px-3 sm:py-2">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-lg sm:rounded-xl bg-black/20">
                        {a.cover_url || a.cover_file_path ? (
                          <img
                            src={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: BUCKET })}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--text)]">{a.title}</div>
                        {a.release_year ? <div className="text-xs text-muted">{a.release_year}</div> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-nowrap">
                      <button type="button" onClick={() => openAssignSongs(a)} className="rounded-lg border border-app bg-panel2 px-2 py-1 text-xs text-[var(--text)] hover:bg-white/10">
                        + Songs
                      </button>
                      <button type="button" onClick={() => startEdit(a)} className="rounded-lg border border-app bg-panel2 px-2 py-1 text-xs text-[var(--text)] hover:bg-white/10">
                        Edit
                      </button>
                      <button type="button" onClick={() => del(a.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20">
                        Del
                      </button>
                    </div>
                  </div>
                ))}
                {albums.length === 0 ? <div className="text-sm text-muted">No albums yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-app bg-panel p-4 sm:p-6 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">iTunes Import</h2>
              <button type="button" onClick={() => setImportModalOpen(false)} className="text-muted hover:text-[var(--text)]">
                ✕
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search albums..."
                className="flex-1 rounded-lg border border-app bg-input px-4 py-3 text-sm text-[var(--text)] outline-none"
              />
              <button type="button" disabled={importing} onClick={doSearch} className="btn-primary rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {importing ? "..." : "Search"}
              </button>
            </div>
            {importResults.length > 0 && (
              <div className="mt-3 flex items-center justify-between border-b border-app pb-2">
                <div className="flex gap-2 text-sm text-muted">
                  <button type="button" onClick={selectAll} className="hover:text-[var(--text)]">Select All</button>
                  <span>|</span>
                  <button type="button" onClick={deselectAll} className="hover:text-[var(--text)]">Deselect All</button>
                  <span className="ml-2 text-[var(--accent)]">{selectedImportIds.size} selected</span>
                </div>
                <button
                  type="button"
                  disabled={selectedImportIds.size === 0 || bulkImporting}
                  onClick={bulkImportSelected}
                  className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {bulkImporting ? "Importing..." : `Import ${selectedImportIds.size} Albums`}
                </button>
              </div>
            )}
            <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-2">
              {importResults.map((r) => (
                <div
                  key={r.collectionId}
                  className={`flex items-center gap-3 rounded-lg border border-app p-3 cursor-pointer transition ${
                    selectedImportIds.has(r.collectionId) ? "bg-[var(--accent)]/10" : "bg-input"
                  }`}
                  onClick={() => toggleSelection(r.collectionId)}
                >
                  <input type="checkbox" checked={selectedImportIds.has(r.collectionId)} onChange={() => {}} className="h-4 w-4 rounded" />
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-panel2">
                    {r.artworkUrl100 && <img src={r.artworkUrl100} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--text)]">{r.collectionName}</div>
                    <div className="truncate text-xs text-muted">{r.artistName}</div>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); importFromItunes(r); }} className="shrink-0 btn-secondary rounded-lg px-3 py-2 text-xs font-semibold">
                    Single
                  </button>
                </div>
              ))}
              {importResults.length === 0 && !importing && (
                <div className="text-center text-sm text-muted">Search for albums to import from iTunes.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {assignSongsModalOpen && assigningAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-app bg-panel p-4 sm:p-6 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Assign Songs to "{assigningAlbum.title}"</h2>
              <button type="button" onClick={() => setAssignSongsModalOpen(false)} className="text-muted hover:text-[var(--text)]">
                ✕
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between border-b border-app pb-2">
              <div className="flex gap-2 text-sm text-muted">
                <button type="button" onClick={() => selectAllSongs(allSongs)} className="hover:text-[var(--text)]">Select All</button>
                <span>|</span>
                <button type="button" onClick={deselectAllSongs} className="hover:text-[var(--text)]">Deselect All</button>
                <span className="ml-2 text-[var(--accent)]">{selectedSongIds.size} selected</span>
              </div>
              <button
                type="button"
                disabled={selectedSongIds.size === 0 || assigningSongs}
                onClick={assignSongsToAlbum}
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {assigningSongs ? "Assigning..." : `Assign ${selectedSongIds.size} Songs`}
              </button>
            </div>
            <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-2">
              {allSongs.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-lg border border-app p-3 cursor-pointer transition ${
                    selectedSongIds.has(s.id) ? "bg-[var(--accent)]/10" : "bg-input"
                  }`}
                  onClick={() => toggleSongSelection(s.id)}
                >
                  <input type="checkbox" checked={selectedSongIds.has(s.id)} onChange={() => {}} className="h-4 w-4 rounded" />
                  <img
                    src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--text)]">{s.title}</div>
                    <div className="truncate text-xs text-muted">{s.year}</div>
                  </div>
                </div>
              ))}
              {allSongs.length === 0 && <div className="text-center text-sm text-muted">No songs available.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
