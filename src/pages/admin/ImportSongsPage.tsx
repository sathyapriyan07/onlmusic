import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { AdminCard, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Search, ArrowLeft, Check, Music } from "lucide-react";

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string | null;
  artworkUrl100: string | null;
  trackTimeMillis: number | null;
}

export default function ImportSongsPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [songs] = useState<{ title: string }[]>([]);
  
  const [searchSource, setSearchSource] = useState<"itunes" | "musicbrainz" | "deezer">("itunes");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ItunesTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setErr(null);
    setResults([]);
    
    try {
      const term = encodeURIComponent(query.trim());
      let res: Response;
      
      if (searchSource === "itunes") {
        res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=25`);
        if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
        const data = await res.json();
        if (data.errorMessage) throw new Error(data.errorMessage);
        const raw = data.results || [];
        const mapped: ItunesTrack[] = raw
          .filter((r: Record<string, unknown>) => r.trackId && r.trackName)
          .map((r: Record<string, unknown>) => ({
            trackId: r.trackId as number,
            trackName: r.trackName as string,
            artistName: r.artistName as string,
            collectionName: r.collectionName as string | null,
            artworkUrl100: r.artworkUrl100 as string | null,
            trackTimeMillis: r.trackTimeMillis as number | null,
          }));
        setResults(mapped);
      } else if (searchSource === "musicbrainz") {
        res = await fetch(`https://musicbrainz.org/ws/2/recording?query=recording:${term}&fmt=json&limit=25`);
        const data = await res.json();
        const mapped: ItunesTrack[] = (data.recordings ?? []).map((r: Record<string, unknown>, idx: number) => ({
          trackId: idx,
          trackName: r.title as string,
          artistName: (Array.isArray(r.artistcredit) && r.artistcredit[0] ? (r.artistcredit[0] as Record<string, unknown>)?.name : "Unknown") as string,
          collectionName: (Array.isArray(r.releases) && r.releases[0] ? (r.releases[0] as Record<string, unknown>)?.title : null) as string | null,
          artworkUrl100: null,
          trackTimeMillis: (r.length as number) || null,
        }));
        setResults(mapped);
      } else {
        res = await fetch(`https://api.deezer.com/search/track?q=${term}&limit=25`);
        const data = await res.json();
        const mapped: ItunesTrack[] = (data.data ?? []).map((r: Record<string, unknown>) => ({
          trackId: r.id as number,
          trackName: r.title as string,
          artistName: (r.artist as Record<string, unknown>)?.name as string,
          collectionName: (r.album as Record<string, unknown>)?.title as string | null,
          artworkUrl100: (r.album as Record<string, unknown>)?.cover_medium as string | null,
          trackTimeMillis: (r.duration as number) ? (r.duration as number) * 1000 : null,
        }));
        setResults(mapped);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function importSelected() {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setErr(null);
    
    try {
      const toImport = results.filter(r => selectedIds.has(r.trackId));
      const inserts: Array<{ title: string; published: boolean }> = [];
      
      for (const r of toImport) {
        if (songs.some(s => s.title.toLowerCase() === r.trackName.toLowerCase())) continue;
        inserts.push({ title: r.trackName, published: true });
      }
      
      if (inserts.length > 0) {
        const { error } = await supabase.from("songs").insert(inserts);
        if (error) throw error;
      }
      
      navigate("/admin/songs");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <Helmet>
        <title>Import Songs · Admin</title>
      </Helmet>

      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/admin/songs")} className="p-2 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Import Songs</h1>
          <p className="text-sm text-[var(--muted)]">Search and import from external sources</p>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      {/* Search Section */}
      <AdminCard title="Search Songs">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSearchSource("itunes")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                searchSource === "itunes" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              iTunes
            </button>
            <button
              onClick={() => setSearchSource("musicbrainz")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                searchSource === "musicbrainz" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              MusicBrainz
            </button>
            <button
              onClick={() => setSearchSource("deezer")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                searchSource === "deezer" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-[var(--text)]"
              }`}
            >
              Deezer
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search for songs..."
              className="flex-1 px-4 py-3 bg-white/5 border border-app rounded-xl text-[var(--text)] text-sm outline-none focus:border-[var(--accent)]"
            />
            <AdminButton onClick={search} disabled={searching}>
              {searching ? "..." : <Search className="w-4 h-4" />}
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--muted)]">
              {results.length} results found
              {selectedIds.size > 0 && <span className="text-[var(--accent)] ml-2">({selectedIds.size} selected)</span>}
            </p>
            <AdminButton onClick={importSelected} disabled={selectedIds.size === 0 || importing}>
              {importing ? "Importing..." : `Import ${selectedIds.size} Songs`}
            </AdminButton>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.trackId}
                onClick={() => toggleSelect(r.trackId)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                  selectedIds.has(r.trackId) ? "bg-[var(--accent)]/20" : "bg-panel hover:bg-white/5"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedIds.has(r.trackId) ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--muted)]"
                }`}>
                  {selectedIds.has(r.trackId) && <Check className="w-4 h-4 text-black" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">{r.trackName}</p>
                  <p className="text-sm text-[var(--muted)]">{r.artistName}{r.collectionName && ` · ${r.collectionName}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !searching && query && (
        <div className="mt-6">
          <AdminEmpty title="No results found" description="Try a different search term" />
        </div>
      )}

      {results.length === 0 && !searching && !query && (
        <div className="mt-6">
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
            <p className="text-[var(--muted)]">Search for songs to import</p>
          </div>
        </div>
      )}
    </div>
  );
}