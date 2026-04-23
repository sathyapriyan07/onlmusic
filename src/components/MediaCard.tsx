import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import clsx from "clsx";

export type MediaCardVariant = "song" | "album" | "artist" | "video";

interface MediaCardProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  variant?: MediaCardVariant;
  duration?: string;
  onPlay?: () => void;
  showPlayOnHover?: boolean;
}

export default function MediaCard({
  to,
  image,
  title,
  subtitle,
  variant = "album",
  duration,
  onPlay,
  showPlayOnHover = true,
}: MediaCardProps) {
  const aspectClasses = {
    song: "aspect-square",
    album: "aspect-square",
    artist: "aspect-square rounded-full",
    video: "aspect-video",
  };

  const sizeClasses = {
    song: "w-44",
    album: "w-48",
    artist: "w-36",
    video: "w-64",
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay) onPlay();
  };

  return (
    <Link
      to={to}
      className={clsx(
        "group block media-card",
        variant === "artist" ? "" : sizeClasses[variant]
      )}
      style={variant === "artist" ? { width: "9rem" } : undefined}
    >
      <div
        className={clsx(
          "relative overflow-hidden bg-[var(--elevated)] media-card-hover",
          aspectClasses[variant]
        )}
        style={variant === "artist" ? { borderRadius: "50%" } : { borderRadius: "8px" }}
      >
        {image ? (
          <>
            <img
              src={image}
              loading="lazy"
              alt=""
              className="h-full w-full object-cover"
            />
            {showPlayOnHover && variant !== "artist" && (
              <div className="play-overlay">
                <button
                  type="button"
                  onClick={handlePlayClick}
                  className="play-button"
                  aria-label="Play"
                >
                  <Play className="h-5 w-5 text-white fill-white" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full bg-[var(--elevated)]" />
        )}

        {variant === "video" && duration && (
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </div>
        )}
      </div>

      <div className="mt-3 px-1">
        <div className="line-clamp-2 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
          {title}
        </div>
        {subtitle && (
          <div className="line-clamp-1 text-xs text-[var(--text-secondary)] mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}