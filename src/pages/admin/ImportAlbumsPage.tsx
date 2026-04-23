import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { AdminCard, AdminButton, AdminEmpty } from "../../components/admin/AdminComponents";
import { Search, ArrowLeft, Check, Disc3 } from "lucide-react";

interface ItunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string | null;
  releaseDate: string | null;
}

export default function ImportAlbumsPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [albums] = useState<{ name: string }[]>([]);
  
  const [searchSource, setSearchSource] = useState<"itunes" | "deezer">("itunes");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ItunesAlbum[]>([]);
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
        res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=25`);
        const data = await res.json();
        const raw = data.resultCount > 0 ? data.results : [];
        const mapped: ItunesAlbum[] = raw
          .filter((r: Record<string, unknown>) => r.collectionId && r.collectionName)
          .map((r: Record<string, unknown>) => ({
            collectionId: r.collectionId as number,
            collectionName: r.collectionName as string,
            artistName: r.artistName as string,
            artworkUrl100: r.artworkUrl100 as string | null,
            releaseDate: r.releaseDate as string | null,
          }));
        setResults(mapped);
      } else {
        res = await fetch(`https://api.deezer.com/search/album?q=${term}&limit=25`);
        const data = await res.json();
        const mapped: ItunesAlbum[] = (data.data ?? []).map((r: Record<string, unknown>) => ({
          collectionId: r.id as number,
          collectionName: r.title as string,
          artistName: (r.artist as Record<string, unknown>)?.name as string,
          artworkUrl100: (r.cover_medium ?? r.cover) as string | null,
          releaseDate: null,
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
      const toImport = results.filter(r => selectedIds.has(r.collectionId));
      const inserts: Array<{ name: string; published: boolean }> = [];
      
      for (const r of toImport) {
        if (albums.some(a => a.name.toLowerCase() === r.collectionName.toLowerCase())) continue;
        inserts.push({ name: r.collectionName, published: true });
      }
      
      if (inserts.length > 0) {
        const { error } = await supabase.from("albums").insert(inserts);
        if (error) throw error;
      }
      
      navigate("/admin/albums");
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
        <title>Import Albums · Admin</title>
      </Helmet>

      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/admin/albums")} className="p-2 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Import Albums</h1>
          <p className="text-sm text-[var(--muted)]">Search and import from external sources</p>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {err}
        </div>
      )}

      {/* Search Section */}
      <AdminCard title="Search Albums">
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
              placeholder="Search for albums..."
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
              {importing ? "Importing..." : `Import ${selectedIds.size} Albums`}
            </AdminButton>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.collectionId}
                onClick={() => toggleSelect(r.collectionId)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                  selectedIds.has(r.collectionId) ? "bg-[var(--accent)]/20" : "bg-panel hover:bg-white/5"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedIds.has(r.collectionId) ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--muted)]"
                }`}>
                  {selectedIds.has(r.collectionId) && <Check className="w-4 h-4 text-black" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">{r.collectionName}</p>
                  <p className="text-sm text-[var(--muted)]">{r.artistName}</p>
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
            <Disc3 className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
            <p className="text-[var(--muted)]">Search for albums to import</p>
          </div>
        </div>
      )}
    </div>
  );
}