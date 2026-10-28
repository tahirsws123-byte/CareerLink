import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api.js";
import useAuth from "../hooks/useAuth.js";
import PasswordInput from "../components/PasswordInput.jsx";

export default function Register() {
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");

    if (oauthError) {
      toast.error(oauthError);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleChange = (key) => (event) => {
    setForm((previousForm) => ({
      ...previousForm,
      [key]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const firstName = form.first.trim();
    const lastName = form.last.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!firstName || !lastName || !email || !password) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const name = `${firstName} ${lastName}`;

    try {
      setLoading(true);

      const response = await api.post("/users/register", {
        name,
        email,
        password,
      });

      const { _id, name: userName, email: userEmail, profilePicture, token } = response.data;

      login(
        {
          _id,
          name: userName,
          email: userEmail,
          profilePicture,
        },
        token,
      );

      toast.success("Account created successfully");

      navigate("/feed", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    window.location.assign(`${api.defaults.baseURL}/users/auth/google`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-warm">
      <header className="mx-auto w-full max-w-[1128px] px-6 py-4">
        <Link
          to="/"
          className="text-[28px] font-bold text-brand"
          aria-label="CareerLink homepage"
        >
          Career<span className="text-ink">Link</span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-4">
        <div className="w-full max-w-[420px]">
          <h1 className="text-center text-[28px] font-light leading-tight text-ink">
            Make the most of your professional life
          </h1>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.08)] sm:p-8">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="First name"
                  value={form.first}
                  onChange={handleChange("first")}
                />

                <Field
                  label="Last name"
                  value={form.last}
                  onChange={handleChange("last")}
                />
              </div>

              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
              />

              <Field
                label="Password (6+ characters)"
                type="password"
                value={form.password}
                onChange={handleChange("password")}
              />

              <p className="pt-1 text-[12px] leading-relaxed text-muted-ink">
                By clicking Agree & Join, you agree to CareerLink&apos;s{" "}
                <a href="#" className="text-brand hover:underline">
                  User Agreement
                </a>
                ,{" "}
                <a href="#" className="text-brand hover:underline">
                  Privacy Policy
                </a>
                , and{" "}
                <a href="#" className="text-brand hover:underline">
                  Cookie Policy
                </a>
                .
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand py-2.5 text-[15px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Agree & Join"}
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

            <p className="mt-5 text-center text-[14px] text-muted-ink">
              Already on CareerLink?{" "}
              <Link
                to="/login"
                className="font-semibold text-brand hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink">
        {label}
      </span>

      {type === "password" ? (
        <PasswordInput
          required
          value={value}
          onChange={onChange}
          className="w-full rounded border border-line bg-white px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      ) : (
        <input
          type={type}
          required
          value={value}
          onChange={onChange}
          className="w-full rounded border border-line bg-white px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      )}
    </label>
  );
}
