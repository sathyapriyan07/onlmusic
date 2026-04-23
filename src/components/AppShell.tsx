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
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Desktop Sidebar - YouTube Music style, reduced emphasis */}
      <aside className="fixed bottom-0 left-0 top-0 hidden w-[200px] flex-col overflow-y-auto bg-[var(--surface)] lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]">
            <Music2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-semibold text-[var(--text)]">ONL Music</span>
        </Link>

        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--hover)] text-[var(--text)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--hover)] text-[var(--text)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                )
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-[var(--border)] px-5 py-4">
          {user ? (
            <div className="truncate text-xs text-[var(--text-secondary)]">{user.email}</div>
          ) : (
            <Link
              to="/login"
              className="inline-block text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              Sign in
            </Link>
          )}
          {user && (
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text)]"
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-16 lg:ml-[200px]">
        {/* Top Bar - Desktop - YouTube Music style */}
        <header className="sticky top-0 z-40 hidden items-center justify-between bg-[var(--surface)]/95 px-6 py-3 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--hover)] text-[var(--text)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="w-80">
              <UnifiedSearch />
            </div>
            <ThemeToggle />
            {user && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                <span className="text-xs font-semibold text-white">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Horizontal Nav - chips style */}
        <nav className="scrollbar-hide lg:hidden flex gap-1.5 overflow-x-auto px-4 py-3 bg-[var(--surface)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  isActive
                    ? "bg-[var(--accent)] text-white border-transparent"
                    : "bg-[var(--elevated)] text-[var(--text-secondary)] border-[var(--border)]"
                )
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
          {role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  isActive
                    ? "bg-[var(--accent)] text-white border-transparent"
                    : "bg-[var(--elevated)] text-[var(--text-secondary)] border-[var(--border)]"
                )
              }
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Search - Mobile */}
        <div className="px-4 py-3 lg:hidden bg-[var(--surface)]">
          <UnifiedSearch />
        </div>

        {/* Page Content - edge to edge */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}