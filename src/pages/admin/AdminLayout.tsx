import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-xl px-3 py-2 text-sm transition whitespace-nowrap",
    isActive ? "bg-panel2 text-[var(--text)]" : "text-[var(--muted)] hover:bg-panel2 hover:text-[var(--text)]",
  ].join(" ");

export default function AdminLayout() {
  return (
    <div className="space-y-4">
      {/* Mobile: Horizontal scroll nav */}
      <nav className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
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
        <NavLink to="/admin/rights" className={linkClass}>
          Rights
        </NavLink>
        <NavLink to="/admin/homepage" className={linkClass}>
          Homepage
        </NavLink>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block rounded-xl border border-app bg-panel p-4">
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
            <NavLink to="/admin/rights" className={linkClass}>
              Rights
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
    </div>
  );
}
