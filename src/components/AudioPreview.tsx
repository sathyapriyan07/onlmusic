import { useRef, useState } from "react";

export default function AudioPreview({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!src) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const handleEnded = () => setPlaying(false);

  return (
    <div className="flex items-center gap-3 bg-[var(--elevated)] rounded-full px-4 py-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]"
      >
        {playing ? (
          <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <audio ref={audioRef} src={src} onEnded={handleEnded} preload="none" />
      <div className="flex-1 text-xs text-[var(--text-secondary)]">
        {playing ? "Playing preview..." : "30 second preview"}
      </div>
    </div>
  );
}