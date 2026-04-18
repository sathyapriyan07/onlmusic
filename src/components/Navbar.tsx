import { Link, NavLink, useNavigate } from "react-router-dom";
import { Music2, Shield, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../state/AuthProvider";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-full px-3 py-2 text-sm transition",
    isActive ? "bg-panel2 text-white" : "text-zinc-300 hover:bg-panel2 hover:text-white",
  ].join(" ");

export default function Navbar() {
  const { user, role, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-app bg-app backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-panel2 shadow-card">
            <Music2 className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">ONL Music</span>
          <span className="hidden text-sm text-muted sm:inline">Discovery</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/songs" className={navLinkClass}>
            Songs
          </NavLink>
          <NavLink to="/albums" className={navLinkClass}>
            Albums
          </NavLink>
          <NavLink to="/artists" className={navLinkClass}>
            Artists
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {role === "admin" ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-panel2 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}

          {!loading && !user ? (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90"
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
              className="inline-flex items-center gap-2 rounded-full bg-panel2 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:hidden">
        <NavLink to="/" className={navLinkClass} end>
          Home
        </NavLink>
        <NavLink to="/songs" className={navLinkClass}>
          Songs
        </NavLink>
        <NavLink to="/albums" className={navLinkClass}>
          Albums
        </NavLink>
        <NavLink to="/artists" className={navLinkClass}>
          Artists
        </NavLink>
      </div>
    </header>
  );
}
