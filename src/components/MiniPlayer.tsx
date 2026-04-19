import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Heart } from "lucide-react";

interface MiniPlayerProps {
  image?: string;
  title?: string;
  artist?: string;
  links?: Array<{
    platform: string;
    url: string;
  }>;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export default function MiniPlayer({
  image,
  title,
  artist,
  links = [],
  isPlaying = false,
  onPlayPause,
}: MiniPlayerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!title) return null;

  return (
    <>
      {/* Compact Player */}
      <div
        onClick={() => setExpanded(true)}
        className="fixed bottom-0 left-0 right-0 z-50 cursor-pointer border-t border-subtle bg-premium/95 backdrop-blur-xl lg:left-64"
      >
        <div className="flex h-20 items-center justify-between px-4">
          {/* Left: Track Info */}
          <div className="flex items-center gap-3">
            {image && (
              <img
                src={image}
                alt=""
                className="h-14 w-14 rounded-lg object-cover"
              />
            )}
            <div>
              <div className="line-clamp-1 text-sm font-semibold text-primary">
                {title}
              </div>
              <div className="line-clamp-1 text-xs text-tertiary">{artist}</div>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-3">
            <button className="rounded-full p-2 text-tertiary transition hover:text-primary">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause?.();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </button>
            <button className="rounded-full p-2 text-tertiary transition hover:text-primary">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Right: Links */}
          <div className="hidden items-center gap-2 sm:flex">
            <button className="rounded-full p-2 text-tertiary transition hover:text-pink-500">
              <Heart className="h-5 w-5" />
            </button>
            {links.slice(0, 3).map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition hover:bg-pink-500 hover:text-white"
              >
                {link.platform}
              </a>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-surface">
          <div className="h-full w-1/3 bg-gradient-to-r from-pink-500 to-violet-600" />
        </div>
      </div>

      {/* Expanded Player Modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute right-6 top-6 rounded-full p-3 text-secondary transition hover:text-primary"
            >
              ✕
            </button>

            {/* Large Album Art */}
            <div className="mx-auto mb-8 w-80 shadow-glow">
              {image && (
                <img
                  src={image}
                  alt=""
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              )}
            </div>

            {/* Track Info */}
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary">
                {title}
              </div>
              <div className="text-lg text-secondary">{artist}</div>
            </div>

            {/* Progress */}
            <div className="my-8">
              <div className="h-2 rounded-full bg-surface">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink-500 to-violet-600" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-tertiary">
                <span>1:23</span>
                <span>3:45</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button className="rounded-full p-3 text-tertiary transition hover:text-primary">
                <SkipBack className="h-6 w-6" />
              </button>
              <button className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-glow transition-transform hover:scale-105">
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 fill-current" />
                )}
              </button>
              <button className="rounded-full p-3 text-tertiary transition hover:text-primary">
                <SkipForward className="h-6 w-6" />
              </button>
            </div>

            {/* External Links */}
            {links.length > 0 && (
              <div className="mt-8 flex justify-center gap-3">
                {links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-secondary transition hover:bg-pink-500 hover:text-white"
                  >
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}