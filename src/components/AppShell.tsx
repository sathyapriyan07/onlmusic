import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Album, Home, Music2, Shield, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../state/AuthProvider";
import UnifiedSearch from "./UnifiedSearch";

function PageTitle() {
  const loc = useLocation();
  const path = loc.pathname;
  if (path.startsWith("/songs")) return "Songs";
  if (path.startsWith("/albums")) return "Albums";
  if (path.startsWith("/artists")) return "Artists";
  if (path.startsWith("/admin")) return "Admin";
  if (path.startsWith("/login")) return "Sign in";
  return "Home";
}

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
    <div className="flex min-h-screen bg-[#121212]">
      {/* Desktop Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 hidden w-[240px] flex-col overflow-y-auto bg-black pb-6 lg:flex">
        <Link to="/" className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]">
            <Music2 className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold text-white">ONL Music</span>
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
                  isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
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
                  isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                )
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 px-6 py-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Account</div>
          <div className="truncate text-sm text-zinc-400">{user?.email ?? "Guest"}</div>
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="mt-2 text-sm text-zinc-400 hover:text-white"
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="mt-2 inline-block text-sm font-semibold text-white hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-24 lg:ml-[240px]">
        {/* Top Bar - Desktop */}
        <header className="sticky top-0 z-40 hidden items-center justify-between bg-black/80 px-8 py-4 backdrop-blur-lg lg:flex">
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
                      isActive ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="w-72">
            <UnifiedSearch />
          </div>
        </header>

        {/* Page Title - Mobile */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 lg:hidden">
          <div>
            <div className="text-xl font-bold text-white">
              <PageTitle />
            </div>
            <div className="text-xs text-zinc-500">Discovery</div>
          </div>
          {role === "admin" && (
            <Link
              to="/admin"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              Admin
            </Link>
          )}
        </div>

        {/* Search - Mobile */}
        <div className="px-4 py-3 lg:hidden">
          <UnifiedSearch />
        </div>

        {/* Page Content */}
        <div className="px-4 py-4 sm:px-6 lg:px-8">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-white/10 bg-black/95 py-2 lg:hidden z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition",
                isActive ? "text-[var(--accent)]" : "text-zinc-500"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}