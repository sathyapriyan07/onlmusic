import { Navigate, Route, Routes } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ThemeProvider } from "./state/ThemeProvider";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import SongsPage from "./pages/SongsPage";
import SongDetailPage from "./pages/SongDetailPage";
import AlbumsPage from "./pages/AlbumsPage";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistDetailPage from "./pages/ArtistDetailPage";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import AdminArtistsPage from "./pages/admin/AdminArtistsPage";
import AdminAlbumsPage from "./pages/admin/AdminAlbumsPage";
import AdminSongsPage from "./pages/admin/AdminSongsPage";
import AdminHomepageSectionsPage from "./pages/admin/AdminHomepageSectionsPage";
import AdminLinksPage from "./pages/admin/AdminLinksPage";
import AdminMusicRightsPage from "./pages/admin/AdminMusicRightsPage";
import RequireAdmin from "./components/RequireAdmin";

export default function App() {
  return (
    <ThemeProvider>
      <AppShell>
      <Helmet>
        <title>ONL Music Discovery</title>
        <meta
          name="description"
          content="Discover songs, albums, and artists — curated metadata and links only (no streaming)."
        />
      </Helmet>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/songs" element={<SongsPage />} />
        <Route path="/songs/:id" element={<SongDetailPage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/albums/:id" element={<AlbumDetailPage />} />
        <Route path="/artists" element={<ArtistsPage />} />
        <Route path="/artists/:id" element={<ArtistDetailPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="artists" element={<AdminArtistsPage />} />
          <Route path="albums" element={<AdminAlbumsPage />} />
          <Route path="songs" element={<AdminSongsPage />} />
          <Route path="homepage" element={<AdminHomepageSectionsPage />} />
          <Route path="links" element={<AdminLinksPage />} />
          <Route path="rights" element={<AdminMusicRightsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
    </ThemeProvider>
  );
}
