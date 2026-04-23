import { NavLink, Outlet } from "react-router-dom";
import { Home, Mic2, Disc, Music2, Link, Shield, LayoutGrid } from "lucide-react";

const navItems = [
  { to: "/admin", icon: Home, label: "Overview", end: true },
  { to: "/admin/artists", icon: Mic2, label: "Artists" },
  { to: "/admin/albums", icon: Disc, label: "Albums" },
  { to: "/admin/songs", icon: Music2, label: "Songs" },
  { to: "/admin/links", icon: Link, label: "Links" },
  { to: "/admin/rights", icon: Shield, label: "Rights" },
  { to: "/admin/homepage", icon: LayoutGrid, label: "Homepage" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
    isActive
      ? "bg-[var(--accent)] text-black"
      : "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--text)]"
  }`;

export default function AdminLayout() {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
      {/* Mobile Horizontal Nav */}
      <nav className="lg:hidden flex gap-1 overflow-x-auto pb-3 px-3 border-b border-app">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[var(--accent)] text-black"
                  : "bg-panel text-[var(--muted)]"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-app bg-panel p-4">
        <div className="px-4 py-2 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Management</h2>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}