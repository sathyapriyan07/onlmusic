import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-2xl px-4 py-3 text-sm transition",
    isActive ? "bg-panel2 text-white" : "text-zinc-300 hover:bg-panel2 hover:text-white",
  ].join(" ");

export default function AdminLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-3xl border border-app bg-white/5 p-4 shadow-card">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Admin</div>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={linkClass}>
            Overview
          </NavLink>
          <NavLink to="/admin/artists" className={linkClass}>
            Artists
          </NavLink>
          <NavLink to="/admin/albums" className={linkClass}>
            Albums
          </NavLink>
          <NavLink to="/admin/songs" className={linkClass}>
            Songs
          </NavLink>
          <NavLink to="/admin/links" className={linkClass}>
            Links
          </NavLink>
          <NavLink to="/admin/homepage" className={linkClass}>
            Homepage sections
          </NavLink>
        </nav>
      </aside>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
