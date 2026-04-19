import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import clsx from "clsx";

type MediaCardVariant = "square" | "round" | "large";

interface MediaCardProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  variant?: MediaCardVariant;
  showPlayButton?: boolean;
}

export default function MediaCard({
  to,
  image,
  title,
  subtitle,
  variant = "square",
  showPlayButton = false,
}: MediaCardProps) {
  const aspectClass = {
    square: "aspect-square",
    round: "aspect-square",
    large: "aspect-[3/4]",
  }[variant];

  const radiusClass = {
    square: "rounded-2xl",
    round: "rounded-full",
    large: "rounded-2xl",
  }[variant];

  return (
    <Link
      to={to}
      className="group relative block shrink-0"
    >
      <div
        className={clsx(
          "relative overflow-hidden bg-card transition-all duration-300",
          radiusClass,
          aspectClass,
          "group-hover:shadow-glow group-hover:scale-[1.02]"
        )}
      >
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            <div className="h-12 w-12 rounded-full bg-card" />
          </div>
        )}

        {/* Play Button Overlay */}
        {(showPlayButton || variant === "large") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-14 w-14 translate-y-4 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform duration-300 group-hover:translate-y-0">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Info */}
      <div className="mt-3">
        <div className="line-clamp-1 text-sm font-semibold text-primary transition-colors group-hover:text-pink-500">
          {title}
        </div>
        {subtitle && (
          <div className="line-clamp-1 text-xs text-tertiary">{subtitle}</div>
        )}
      </div>
    </Link>
  );
}