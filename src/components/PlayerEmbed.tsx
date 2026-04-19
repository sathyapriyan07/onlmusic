import { extractYouTubeId } from "../lib/youtube";

export default function PlayerEmbed({ url }: { url: string }) {
  const id = extractYouTubeId(url);
  if (!id) return null;

  const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-panel">
      <div className="aspect-video w-full">
        <iframe
          title="YouTube player"
          src={src}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

