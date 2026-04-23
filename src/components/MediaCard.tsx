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
  size?: "small" | "medium" | "large";
}

export default function MediaCard({
  to,
  image,
  title,
  subtitle,
  variant = "album",
  duration,
  size = "medium",
}: MediaCardProps) {
  const aspectClasses = {
    song: "aspect-square",
    album: "aspect-square",
    artist: "aspect-square rounded-full",
    video: "aspect-video",
  };

  const sizeClasses = {
    small: {
      song: "w-32 sm:w-40",
      album: "w-36 sm:w-44",
      artist: "w-28 sm:w-36",
      video: "w-48 sm:w-64",
    },
    medium: {
      song: "w-36 sm:w-44",
      album: "w-40 sm:w-48",
      artist: "w-32 sm:w-40",
      video: "w-56 sm:w-72",
    },
    large: {
      song: "w-40 sm:w-48 md:w-52",
      album: "w-44 sm:w-52 md:w-56",
      artist: "w-36 sm:w-44",
      video: "w-64 sm:w-80",
    },
  };

  const roundedStyle = variant === "artist" ? { borderRadius: "50%", width: sizeClasses[size].artist } : undefined;
  const defaultStyle = variant !== "artist" ? { width: sizeClasses[size][variant] } : undefined;

  return (
    <Link to={to} className="block shrink-0" style={roundedStyle || defaultStyle}>
      <div
        className={clsx(
          "relative overflow-hidden bg-[var(--elevated)]",
          aspectClasses[variant]
        )}
        style={variant === "artist" ? { borderRadius: "50%" } : { borderRadius: "8px" }}
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

      <div className="mt-2 sm:mt-3 px-1">
        <div className="line-clamp-2 text-xs sm:text-sm font-medium text-[var(--text)]">
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