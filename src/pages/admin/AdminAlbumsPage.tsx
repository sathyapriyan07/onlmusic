import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabaseClient";
import type { Album, Artist, Song } from "../../lib/types";
import { listAlbums, listArtists, listSongs } from "../../lib/db";
import { resolveImageSrc } from "../../lib/images";
import { AdminCard, AdminModal, FormField, FormActions, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Plus, Edit2, Trash2, Upload, X, Music, Download } from "lucide-react";

const BUCKET = "album-covers";

export default function AdminAlbumsPage() {
  const navigate = useNavigate();
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
  const [searchQuery, setSearchQuery] = useState("");
  const coverFileRef = useRef<HTMLInputElement>(null);

const [assignSongsModalOpen, setAssignSongsModalOpen] = useState(false);
  const [assigningAlbum, setAssigningAlbum] = useState<Album | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [assigningSongs, setAssigningSongs] = useState(false);

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

  const filteredAlbums = albums.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedArtists = useMemo(() => [...artists].sort((a, b) => a.name.localeCompare(b.name)), [artists]);

  return (
    <div>
      <Helmet>
        <title>Albums · Admin</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Albums</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage your album catalog</p>
        </div>
        <div className="flex gap-2">
          <AdminButton variant="secondary" onClick={() => navigate("/admin/albums/import")}>
            <Download className="w-4 h-4 mr-2" /> Import
          </AdminButton>
          <AdminButton onClick={resetForm}>
            <Plus className="w-4 h-4 mr-2" /> Add Album
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
        <AdminCard title={editing ? "Edit Album" : "Add New Album"}>
          <div className="space-y-4">
            <FormField label="Album Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter album title"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Release Year">
              <input
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </FormField>

            <FormField label="Cover Image">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={coverFileRef}
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  className="flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-app hover:border-[var(--accent)] transition-colors"
                >
                  <Upload className="w-6 h-6 text-[var(--muted)]" />
                </button>
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

            <FormField label="Album Artists">
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {sortedArtists.map((a) => (
                  <label key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={artistIds.includes(a.id)}
                      onChange={(e) => {
                        setArtistIds((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)));
                      }}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text)] truncate">{a.name}</span>
                  </label>
                ))}
                {sortedArtists.length === 0 && <div className="text-sm text-[var(--muted)]">Create artists first.</div>}
              </div>
            </FormField>

            <FormActions>
              <AdminButton onClick={save} disabled={saving || !title.trim()}>
                {saving ? "Saving..." : editing ? "Update Album" : "Add Album"}
              </AdminButton>
              {editing && <AdminButton variant="secondary" onClick={resetForm}>Cancel</AdminButton>}
            </FormActions>
          </div>
        </AdminCard>

        {/* List Card */}
        <AdminCard
          title={`Albums (${filteredAlbums.length})`}
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
          ) : filteredAlbums.length === 0 ? (
            <AdminEmpty title="No albums found" description="Add your first album to get started" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredAlbums.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden shrink-0">
                    {a.cover_url || a.cover_file_path ? (
                      <img
                        src={resolveImageSrc({ url: a.cover_url, filePath: a.cover_file_path, bucket: BUCKET })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-[var(--muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text)] truncate">{a.title}</p>
                    {a.release_year && <p className="text-xs text-[var(--muted)]">{a.release_year}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openAssignSongs(a)}
                      className="p-2 rounded-lg bg-white/10 text-[var(--muted)] hover:text-[var(--text)]"
                      title="Assign Songs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
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

      {/* Assign Songs Modal */}
      <AdminModal open={assignSongsModalOpen} onClose={() => setAssignSongsModalOpen(false)} title={`Assign Songs to "${assigningAlbum?.title}"`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-app">
            <div className="text-sm text-[var(--muted)]">
              <button onClick={() => selectAllSongs(allSongs)} className="hover:text-[var(--text)] mr-3">
                Select All
              </button>
              <button onClick={deselectAllSongs} className="hover:text-[var(--text)]">
                Deselect All
              </button>
              <span className="ml-2 text-[var(--accent)]">{selectedSongIds.size} selected</span>
            </div>
            <AdminButton onClick={assignSongsToAlbum} disabled={selectedSongIds.size === 0 || assigningSongs}>
              {assigningSongs ? "Assigning..." : "Assign"}
            </AdminButton>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {allSongs.map((s) => (
              <div
                key={s.id}
                onClick={() => toggleSongSelection(s.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedSongIds.has(s.id) ? "bg-[var(--accent)]/20" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSongIds.has(s.id)}
                  onChange={() => {}}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                <img
                  src={resolveImageSrc({ url: s.cover_url, filePath: s.cover_file_path, bucket: "song-covers" })}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text)]">{s.title}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{s.year}</div>
                </div>
              </div>
            ))}
            {allSongs.length === 0 && (
              <div className="text-center text-sm text-[var(--muted)] py-8">No songs available.</div>
            )}
          </div>
        </div>
      </AdminModal>
    </div>
  );
}