export default function AudioPreview({ src }: { src: string }) {
  if (!src) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-black">
      <audio controls className="h-10 w-full" src={src}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}