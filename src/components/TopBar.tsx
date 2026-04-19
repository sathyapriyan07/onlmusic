import { Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import UnifiedSearch from "./UnifiedSearch";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between bg-premium/80 px-8 py-4 backdrop-blur-xl lg:flex">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <UnifiedSearch />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button className="rounded-full p-3 text-secondary transition hover:bg-surface hover:text-primary">
          <Bell className="h-5 w-5" />
        </button>
        <Link
          to="/settings"
          className="rounded-full p-3 text-secondary transition hover:bg-surface hover:text-primary"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}