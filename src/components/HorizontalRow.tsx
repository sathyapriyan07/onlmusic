import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";

interface HorizontalRowProps {
  title: string;
  subtitle?: string;
  items: Array<{
    id: string;
    to: string;
    image?: string;
    title: string;
    subtitle?: string;
  }>;
  variant?: "square" | "round" | "large";
}

export default function HorizontalRow({
  title,
  subtitle,
  items,
  variant = "square",
}: HorizontalRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between px-4 lg:px-0">
        <div>
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          {subtitle && <p className="text-sm text-tertiary">{subtitle}</p>}
        </div>
      </div>

      {/* Scroll Container */}
      <div className="relative group">
        {/* Navigation Arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-black/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-black/80"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Items */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-snap-x scroll-snap-center px-4 pb-4 no-scrollbar lg:px-0"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="shrink-0 scroll-snap-center"
            >
              <MediaCard
                to={item.to}
                image={item.image}
                title={item.title}
                subtitle={item.subtitle}
                variant={variant === "round" ? "round" : "square"}
                showPlayButton
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}