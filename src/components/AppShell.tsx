import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Album, Home, Music2, Shield, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../state/AuthProvider";
import UnifiedSearch from "./UnifiedSearch";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/songs", label: "Songs", icon: Music2 },
    { to: "/albums", label: "Albums", icon: Album },
    { to: "/artists", label: "Artists", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-app">
      {/* Desktop Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 hidden w-[240px] flex-col overflow-y-auto bg-panel pb-6 lg:flex">
        <Link to="/" className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]">
            <Music2 className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold text-[var(--text)]">ONL Music</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-[var(--accent)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          {role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-[var(--accent)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
                )
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-app px-6 py-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Account</div>
          <div className="truncate text-sm text-[var(--muted)]">{user?.email ?? "Guest"}</div>
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="mt-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="mt-2 inline-block text-sm font-semibold text-[var(--text)] hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-24 lg:ml-[240px]">
        {/* Top Bar - Desktop */}
        <header className="sticky top-0 z-40 hidden items-center justify-between bg-panel/80 px-8 py-4 backdrop-blur-lg lg:flex">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    clsx(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      isActive ? "bg-[var(--accent)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-72">
              <UnifiedSearch />
            </div>
          </div>
        </header>

        {/* Mobile Horizontal Nav - like admin */}
        <nav className="lg:hidden flex gap-1 overflow-x-auto px-4 py-3 border-b border-app scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  isActive ? "bg-[var(--accent)] text-black" : "bg-panel text-[var(--muted)]"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
          {role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  isActive ? "bg-[var(--accent)] text-black" : "bg-panel text-[var(--muted)]"
                )
              }
            >
              <Shield className="w-4 h-4" />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Search - Mobile */}
        <div className="px-4 py-3 lg:hidden">
          <UnifiedSearch />
        </div>

        {/* Page Content */}
        <div className="overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">{children}</div>
      </main>

      {/* Mobile Bottom Nav - removed, using horizontal nav instead */}
    </div>
  );
}