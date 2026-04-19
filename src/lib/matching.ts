import type { Album, Artist, Song } from "./types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findSimilar<T extends { title?: string; name?: string }>(
  items: T[],
  query: string,
  threshold = 0.7
): { item: T; score: number } | null {
  const q = normalize(query);
  if (!q) return null;

  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    const key = item.name ?? item.title ?? "";
    const n = normalize(key);
    
    let score = 0;
    if (n === q) {
      score = 1;
    } else if (n.includes(q) || q.includes(n)) {
      score = 0.8;
    } else {
      let matches = 0;
      const qChars = q.split("");
      for (const c of n) {
        if (qChars.includes(c)) {
          matches++;
        }
      }
      score = matches / Math.max(q.length, n.length);
    }

    if (score >= threshold && (!best || score > best.score)) {
      best = { item, score };
    }
  }

  return best;
}

export function findSimilarArtist(artists: Artist[], name: string) {
  return findSimilar(artists, name, 0.6);
}

export function findSimilarAlbum(albums: Album[], title: string) {
  return findSimilar(albums, title, 0.6);
}

export function findSimilarSong(songs: Song[], title: string) {
  return findSimilar(songs, title, 0.7);
}