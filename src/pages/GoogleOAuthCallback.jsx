import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);

  return JSON.parse(decoded);
};

export default function GoogleOAuthCallback() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    try {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const token = params.get("token");
      const encodedUser = params.get("user");

      if (!token || !encodedUser) {
        if (isAuthenticated) {
          navigate("/feed", { replace: true });
          return;
        }
        throw new Error("Missing OAuth payload");
      }

      const user = decodeBase64Url(encodedUser);
      if (!user || typeof user !== "object" || Array.isArray(user)) {
        throw new Error("Invalid OAuth user payload");
      }

      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      login(user, token);
      toast.success("Signed in with Google");
      navigate("/feed", { replace: true });
    } catch {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      toast.error("Google sign-in could not be completed");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, login, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-warm px-4 text-sm text-muted-ink">
      Completing Google sign-in...
    </div>
  );
}
