import { Link } from "react-router-dom";
import clsx from "clsx";

export default function MediaCard({
  to,
  image,
  title,
  subtitle,
  variant = "square",
  ratio = "square",
}: {
  to: string;
  image: string;
  title: string;
  subtitle?: string;
  variant?: "square" | "round";
  ratio?: "square" | "poster" | "video";
}) {
  return (
    <Link
      to={to}
      className="group block rounded-xl bg-panel p-3 transition hover:bg-panel2"
    >
      <div
        className={clsx(
          "relative overflow-hidden bg-black/30",
          variant === "round"
            ? "aspect-square rounded-full"
            : ratio === "poster"
              ? "aspect-[3/4] rounded-2xl"
              : ratio === "video"
                ? "aspect-video rounded-2xl"
                : "aspect-square rounded-lg",
        )}
      >
        {image ? (
          <img
            src={image}
            loading="lazy"
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-white/5" />
        )}
      </div>

      <div className="mt-3">
        <div className="line-clamp-1 text-sm font-semibold text-white">{title}</div>
        {subtitle ? <div className="line-clamp-1 text-xs text-muted">{subtitle}</div> : null}
      </div>
    </Link>
  );
}
