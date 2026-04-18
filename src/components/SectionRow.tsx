import { ChevronRight } from "lucide-react";

export default function SectionRow({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
          {title}
          <ChevronRight className="h-4 w-4 text-muted" />
        </h2>
        {action}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-5 sm:px-5">
        <div className="flex snap-x snap-mandatory gap-4">{children}</div>
      </div>
    </section>
  );
}
