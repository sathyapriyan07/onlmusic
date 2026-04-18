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
      className="group block rounded-3xl border border-app bg-white/5 p-3 shadow-card transition hover:-translate-y-0.5 hover:bg-white/10"
    >
      <div
        className={clsx(
          "relative overflow-hidden bg-black/20 ring-1 ring-white/5",
          variant === "round"
            ? "aspect-square rounded-full"
            : ratio === "poster"
              ? "aspect-[3/4] rounded-2xl"
              : ratio === "video"
                ? "aspect-video rounded-2xl"
                : "aspect-square rounded-2xl",
        )}
      >
        {image ? (
          <img
            src={image}
            loading="lazy"
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-white/5" />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>

      <div className="mt-3">
        <div className="line-clamp-1 text-sm font-semibold text-white">{title}</div>
        {subtitle ? <div className="line-clamp-1 text-xs text-muted">{subtitle}</div> : null}
      </div>
    </Link>
  );
}
