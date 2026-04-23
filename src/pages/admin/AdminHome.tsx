import { Helmet } from "react-helmet-async";
import { Mic2, Disc, Music2, Link, LayoutGrid, Shield, Plus } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const statCards = [
  { label: "Artists", icon: Mic2, to: "/admin/artists", color: "bg-pink-500/20 text-pink-400" },
  { label: "Albums", icon: Disc, to: "/admin/albums", color: "bg-purple-500/20 text-purple-400" },
  { label: "Songs", icon: Music2, to: "/admin/songs", color: "bg-blue-500/20 text-blue-400" },
  { label: "Links", icon: Link, to: "/admin/links", color: "bg-green-500/20 text-green-400" },
];

const manageCards = [
  { label: "Homepage Sections", description: "Manage featured content on homepage", icon: LayoutGrid, to: "/admin/homepage" },
  { label: "Music Rights", description: "Manage rights (ASCAP, BMI, etc.)", icon: Shield, to: "/admin/rights" },
];

export default function AdminHome() {
  return (
    <div>
      <Helmet>
        <title>Admin · ONL Music</title>
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Manage your music library</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <RouterLink
            key={card.to}
            to={card.to}
            className="bg-panel rounded-2xl border border-app p-5 hover:border-[var(--accent)] transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4`}>
              <card.icon className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{card.label}</p>
          </RouterLink>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {manageCards.map((card) => (
          <RouterLink
            key={card.to}
            to={card.to}
            className="bg-panel rounded-2xl border border-app p-5 flex items-center gap-4 hover:border-[var(--accent)] transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <card.icon className="w-6 h-6 text-[var(--muted)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">{card.label}</p>
              <p className="text-sm text-[var(--muted)]">{card.description}</p>
            </div>
          </RouterLink>
        ))}
      </div>

      {/* Quick Add Links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Quick Add</h2>
        <div className="flex flex-wrap gap-3">
          <RouterLink
            to="/admin/artists?new=1"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Artist
          </RouterLink>
          <RouterLink
            to="/admin/albums?new=1"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-[var(--text)] rounded-full text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Album
          </RouterLink>
          <RouterLink
            to="/admin/songs?new=1"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-[var(--text)] rounded-full text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Song
          </RouterLink>
        </div>
      </div>
    </div>
  );
}