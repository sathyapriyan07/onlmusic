import { extractYouTubeId } from "../lib/youtube";

export default function PlayerEmbed({ url }: { url: string }) {
  const id = extractYouTubeId(url);
  if (!id) return null;

  const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&controls=1&iv_load_policy=3&showinfo=0&playsinline=1&fs=0`;

  return (
    <div className="overflow-hidden rounded-xl border border-app bg-panel w-48">
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

