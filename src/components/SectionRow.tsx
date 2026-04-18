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
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
        {action}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-5 sm:px-5">
        <div className="flex gap-4">{children}</div>
      </div>
    </section>
  );
}
