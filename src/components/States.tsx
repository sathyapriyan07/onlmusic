export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-xl border border-app bg-panel p-6 text-sm">
      <div className="font-semibold text-white">{title}</div>
      {message ? <div className="mt-1 text-muted">{message}</div> : null}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-xl border border-app bg-panel p-6 text-sm">
      <div className="font-semibold text-white">{title}</div>
      {message ? <div className="mt-1 text-muted">{message}</div> : null}
    </div>
  );
}
