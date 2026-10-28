import { Link, Outlet } from "react-router-dom";
import AuthenticatedHeader from "./AuthenticatedHeader.jsx";
import ChatDock from "./ChatDock.jsx";
import useAuth from "../../hooks/useAuth.js";

export default function ProfilePageLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      {isAuthenticated ? (
        <AuthenticatedHeader />
      ) : (
        <header className="careerlink-header sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link to="/" className="text-lg font-bold text-brand">
              Career<span className="text-ink">Link</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Sign in</Link>
              <Link to="/register" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Join now</Link>
            </div>
          </div>
        </header>
      )}
      <main><Outlet /></main>
      {isAuthenticated && <ChatDock />}
    </>
  );
}
