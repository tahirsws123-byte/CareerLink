import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api.js";
import PasswordInput from "../components/PasswordInput.jsx";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token && !email.trim()) {
      toast.error("Enter your email address");
      return;
    }
    if (token && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (token && password !== confirmation) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      if (token) {
        await api.post("/users/password-reset/confirm", { token, password });
        toast.success("Password reset successfully");
        navigate("/login", { replace: true });
      } else {
        await api.post("/users/password-reset/request", { email: email.trim().toLowerCase() });
        toast.success("If an account exists, a reset link has been sent");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to process password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-warm">
      <header className="mx-auto w-full max-w-282 px-6 py-4">
        <Link to="/" className="text-[28px] font-bold text-brand" aria-label="CareerLink homepage">
          Career<span className="text-ink">Link</span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6">
        <form onSubmit={handleSubmit} className="w-full max-w-100 rounded-lg bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-ink">{token ? "Choose a new password" : "Reset your password"}</h1>
          <p className="mt-1 text-sm text-muted-ink">
            {token
              ? "Your reset link is ready."
              : "Enter your email and we will send a secure reset link. Check your spam folder if it does not arrive."}
          </p>
          {!token && (
            <label htmlFor="reset-email" className="mt-6 block text-sm font-medium text-ink">
              Email address
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded border border-line px-3 py-2.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          )}
          {token && (
            <div className="mt-6 space-y-3">
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-ink">
                New password
                <PasswordInput
                  id="reset-new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1.5 w-full rounded border border-line px-3 py-2.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-ink">
                Confirm new password
                <PasswordInput
                  id="reset-confirm-password"
                  required
                  minLength={8}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-1.5 w-full rounded border border-line px-3 py-2.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Processing..." : token ? "Reset password" : "Send reset link"}
          </button>
          <Link to="/login" className="mt-5 block text-center text-sm font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </form>
      </main>
    </div>
  );
}
