import { NavLink } from "react-router-dom";
import { Home, Disc, Album, Users, Compass, Music2, Shield } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../state/AuthProvider";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/songs", icon: Music2, label: "Songs" },
  { to: "/albums", icon: Album, label: "Albums" },
  { to: "/artists", icon: Users, label: "Artists" },
];

export default function Sidebar() {
  const { user, role } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col overflow-y-auto bg-premium lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-glow">
          <Disc className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold text-primary">ONL Music</div>
          <div className="text-xs text-tertiary">Discovery</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="mb-6">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
            Browse
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-surface text-primary shadow-soft"
                    : "text-secondary hover:bg-surface/50 hover:text-primary"
                )
              }
            >
              <item.icon
                className={clsx(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  "duration-200"
                )}
              />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div>
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
            Library
          </div>
          <NavLink
            to="/songs"
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-surface text-primary"
                  : "text-secondary hover:bg-surface/50 hover:text-primary"
              )
            }
          >
            <Music2 className="h-5 w-5 transition-transform group-hover:scale-110" />
            Your Songs
          </NavLink>
          <NavLink
            to="/albums"
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-surface text-primary"
                  : "text-secondary hover:bg-surface/50 hover:text-primary"
              )
            }
          >
            <Album className="h-5 w-5 transition-transform group-hover:scale-110" />
            Your Albums
          </NavLink>
          <NavLink
            to="/artists"
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-surface text-primary"
                  : "text-secondary hover:bg-surface/50 hover:text-primary"
              )
            }
          >
            <Users className="h-5 w-5 transition-transform group-hover:scale-110" />
            Your Artists
          </NavLink>
        </div>
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-subtle px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Admin */}
      {role === "admin" && (
        <div className="border-t border-subtle px-3 py-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
            Admin
          </div>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-surface text-primary"
                  : "text-secondary hover:bg-surface/50 hover:text-primary"
              )
            }
          >
            <Shield className="h-5 w-5" />
            Admin Panel
          </NavLink>
        </div>
      )}

      {/* User */}
      <div className="border-t border-subtle px-6 py-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-sm font-semibold text-white">
              {user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-primary">
                {user.email}
              </div>
              <div className="text-xs text-tertiary">Signed in</div>
            </div>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:opacity-90"
          >
            Sign In
          </NavLink>
        )}
      </div>
    </aside>
  );
}