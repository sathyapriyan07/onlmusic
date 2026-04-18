import { ExternalLink } from "lucide-react";
import { siApplemusic, siSpotify, siYoutube, siYoutubemusic } from "simple-icons";

type IconDef = { hex: string; path: string; title: string };

function pickIcon(platform: string): IconDef | null {
  const p = platform.trim().toLowerCase();
  if (!p) return null;

  if (p === "youtube" || p.includes("youtube ") || p.includes(" youtube") || p === "yt") return siYoutube;
  if (p.includes("youtube music") || p === "youtubemusic" || p === "ytmusic") return siYoutubemusic;
  if (p.includes("spotify")) return siSpotify;
  if (p.includes("apple music") || p === "applemusic") return siApplemusic;

  return null;
}

export default function PlatformLogo({
  platform,
  className = "h-4 w-4",
}: {
  platform: string;
  className?: string;
}) {
  const icon = pickIcon(platform);
  if (!icon) return <ExternalLink className={className} />;

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={icon.title}
      className={className}
      style={{ color: `#${icon.hex}` }}
    >
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}

