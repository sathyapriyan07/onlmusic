import { Play, ExternalLink, Heart, MoreHorizontal } from "lucide-react";

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  image?: string;
  links?: Array<{
    platform: string;
    url: string;
  }>;
}

export default function HeroBanner({
  title,
  subtitle,
  image,
  links = [],
}: HeroBannerProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl">
      {/* Background */}
      {image && (
        <>
          <div className="absolute inset-0">
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative px-6 py-12 pb-16 pt-32 lg:px-12 lg:py-20 lg:pt-48">
        <div className="max-w-2xl">
          {/* Labels */}
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-500">
              Featured
            </span>
            {subtitle && (
              <span className="text-sm text-secondary">{subtitle}</span>
            )}
          </div>

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white lg:text-6xl">
            {title}
          </h1>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <button className="flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:scale-105 hover:bg-pink-500 hover:text-white">
              <Play className="h-5 w-5 fill-current" />
              Play
            </button>
            <button className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20">
              <Heart className="h-5 w-5" />
            </button>
            <button className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* External Links */}
          {links.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  {link.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}