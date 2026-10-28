import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";
import useAuth from "../hooks/useAuth.js";
import PasswordInput from "../components/PasswordInput.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const navigate = useNavigate();

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");

    if (oauthError) {
      toast.error(oauthError);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/login", {
        email: cleanEmail,
        password,
      });

      const { _id, name, email, profilePicture, token } = response.data;

      login(
        {
          _id,
          name,
          email,
          profilePicture,
        },
        token
      );

      toast.success("Login successful");

      navigate("/feed", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    window.location.assign(`${api.defaults.baseURL}/users/auth/google`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-warm">
      <header className="mx-auto w-full max-w-282 px-6 py-4">
        <Link
          to="/"
          className="text-[28px] font-bold text-brand"
          aria-label="CareerLink homepage"
        >
          Career<span className="text-ink">Link</span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-6">
        <div className="w-full max-w-100">
          <div className="rounded-lg bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.08)] sm:p-8">
            <h1 className="text-[24px] font-semibold text-ink">Welcome back</h1>

            <p className="mt-1 text-[14px] text-muted-ink">
              Sign in to continue to CareerLink
            </p>

            <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-ink">
                  Email
                </span>

                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded border border-line bg-white py-2.5 pl-9 pr-3 text-[14px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-ink">
                  Password
                </span>

                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
                  />

                  <PasswordInput
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    className="w-full rounded border border-line bg-white py-2.5 pl-9 pr-3 text-[14px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </label>

              <Link
                to="/reset-password"
                className="block text-[13px] font-semibold text-brand hover:underline"
              >
                Forgot password?
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand py-2.5 text-[15px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[12px] text-muted-ink">
              <span className="h-px flex-1 bg-line" />
              <span>or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white py-2.5 text-[14px] font-medium text-ink transition hover:bg-black/5"
            >
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.2 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.2 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.4 26.9 35 24 35c-5.2 0-9.6-3.3-11.3-8L6.2 32C9.6 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C42.1 36.4 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-[14px] text-muted-ink">
            New to CareerLink?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand hover:underline"
            >
              Join now
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
