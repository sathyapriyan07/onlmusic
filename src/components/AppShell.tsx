import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Album, Home, LogIn, LogOut, Music2, Shield, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../state/AuthProvider";

function NavItem({
  to,
  label,
  icon,
  end,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
          isActive ? "bg-panel2 text-white" : "text-zinc-300 hover:bg-panel2 hover:text-white",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/30 transition group-hover:bg-black/40">
            <span className={clsx("transition", isActive ? "text-[color:var(--accent)]" : "text-zinc-200")}>
              {icon}
            </span>
          </span>
          <span className="font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}

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
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden min-h-screen bg-black p-4 lg:block">
          <div className="sticky top-0 space-y-3">
            <Link to="/" className="flex items-center gap-3 rounded-xl bg-panel px-4 py-3 text-white hover:bg-panel2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/40">
                <Music2 className="h-5 w-5 text-[color:var(--accent)]" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">ONL Music</div>
                <div className="truncate text-xs text-muted">Discovery</div>
              </div>
            </Link>

            <div className="rounded-xl bg-panel p-2">
              <nav className="space-y-1">
                <NavItem to="/" label="Home" icon={<Home className="h-4 w-4" />} end />
                <NavItem to="/songs" label="Songs" icon={<Music2 className="h-4 w-4" />} />
                <NavItem to="/albums" label="Albums" icon={<Album className="h-4 w-4" />} />
                <NavItem to="/artists" label="Artists" icon={<Users className="h-4 w-4" />} />
                {role === "admin" ? <NavItem to="/admin" label="Admin" icon={<Shield className="h-4 w-4" />} /> : null}
              </nav>
            </div>

            <div className="rounded-xl bg-panel p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Account</div>
              <div className="mt-2 truncate text-white">{user?.email ?? "Guest"}</div>
              <div className="mt-1 text-xs text-muted">{role ? `Role: ${role}` : "Browse publicly"}</div>

              {!loading && !user ? (
                <Link
                  to="/login"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              ) : null}

              {!loading && user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-panel2 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 bg-app backdrop-blur">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-panel lg:hidden">
                  <Music2 className="h-5 w-5 text-[color:var(--accent)]" />
                </Link>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-tight text-white">
                    <PageTitle />
                  </div>
                  <div className="text-xs text-muted">Discovery · Metadata + links only</div>
                </div>
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                {role === "admin" ? (
                  <Link to="/admin" className="rounded-full bg-panel px-3 py-2 text-sm text-white hover:bg-panel2">
                    Admin
                  </Link>
                ) : null}

                {!loading && !user ? (
                  <Link
                    to="/login"
                    className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    Sign in
                  </Link>
                ) : null}

                {!loading && user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }}
                    className="rounded-full bg-panel px-3 py-2 text-sm text-white hover:bg-panel2"
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 pb-4 sm:px-5 lg:hidden">
              {[
                { to: "/", label: "Home", end: true },
                { to: "/songs", label: "Songs" },
                { to: "/albums", label: "Albums" },
                { to: "/artists", label: "Artists" },
              ].map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={({ isActive }) =>
                    clsx(
                      "rounded-full px-3 py-2 text-sm transition",
                      isActive ? "bg-white text-black" : "bg-panel text-white hover:bg-panel2",
                    )
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main className="mx-auto max-w-[1400px] px-4 pb-14 pt-4 sm:px-5 sm:pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
