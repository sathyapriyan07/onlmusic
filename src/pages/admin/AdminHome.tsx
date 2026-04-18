import { Helmet } from "react-helmet-async";

export default function AdminHome() {
  return (
    <div className="rounded-xl border border-app bg-panel p-6">
      <Helmet>
        <title>Admin · ONL Music Discovery</title>
      </Helmet>
      <h1 className="text-lg font-semibold text-white">Admin dashboard</h1>
      <p className="mt-2 text-sm text-muted">
        Use the sidebar to manage artists, albums, songs, links, and homepage sections. CRUD operations are protected by RLS + the `profiles.role`
        value.
      </p>
    </div>
  );
}
