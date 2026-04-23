import { Link } from "react-router-dom";
import clsx from "clsx";

export type MediaCardVariant = "song" | "album" | "artist" | "video";

interface MediaCardProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  variant?: MediaCardVariant;
  duration?: string;
}

export default function MediaCard({
  to,
  image,
  title,
  subtitle,
  variant = "album",
  duration,
}: MediaCardProps) {
  const aspectClasses = {
    song: "aspect-square",
    album: "aspect-square",
    artist: "aspect-square",
    video: "aspect-video",
  };

  return (
    <Link to={to} className="block shrink-0">
      <div
        className={clsx(
          "relative overflow-hidden bg-[var(--elevated)]",
          aspectClasses[variant]
        )}
        style={variant === "artist" ? { borderRadius: "50%" } : { borderRadius: variant === "video" ? "8px" : "4px" }}
      >
        {image ? (
          <img
            src={image}
            loading="lazy"
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[var(--elevated)]" />
        )}

        {variant === "video" && duration && (
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </div>
        )}
      </div>

      <div className="mt-2">
        <div className="text-sm font-medium text-[var(--text)] line-clamp-1">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}