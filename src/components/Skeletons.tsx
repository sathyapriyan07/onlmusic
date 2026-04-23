export function SkeletonCard({ variant = "album" }: { variant?: "song" | "album" | "artist" }) {
  const widthClass = variant === "artist" ? "w-36" : variant === "song" ? "w-44" : "w-48";
  
  return (
    <div className={`shrink-0 ${widthClass}`}>
      <div 
        className={`shimmer ${variant === "artist" ? "aspect-square rounded-full" : "aspect-square rounded-lg"}`}
      />
      <div className="mt-3 space-y-2 px-1">
        <div className="h-4 w-3/4 rounded shimmer" />
        <div className="h-3 w-1/2 rounded shimmer" />
      </div>
    </div>
  );
}

export function SkeletonRow({ count = 6, variant = "album" }: { count?: number; variant?: "song" | "album" | "artist" }) {
  return (
    <div className="media-scroll">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

export function SkeletonArtistCard() {
  return <SkeletonCard variant="artist" />;
}

export function SkeletonSongCard() {
  return <SkeletonCard variant="song" />;
}

export function SkeletonAlbumCard() {
  return <SkeletonCard variant="album" />;
}