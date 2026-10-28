import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import api from "../../services/api.js";

function BrandButton({ children, icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full min-h-[44px] items-center justify-center gap-3 rounded-full border border-line bg-white px-6 py-2.5 text-[15px] font-medium text-muted-ink shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
    >
      <span className="h-5 w-5 shrink-0">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

export default function HeroSection() {
  const handleGoogleAuth = () => {
    window.location.assign(`${api.defaults.baseURL}/users/auth/google`);
  };

  return (
    <section className="w-full overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[minmax(0,540px)_1fr] md:items-center md:gap-8 md:py-20">
        <div>
          <h1 className="max-w-[540px] text-[36px] font-light leading-[1.12] tracking-[-0.01em] text-accent-red md:text-[56px] md:leading-[1.14]">
            Grow your professional network and discover jobs and career tips
          </h1>

          <div className="mt-8 max-w-[360px] space-y-2.5">
            <BrandButton
              onClick={handleGoogleAuth}
              icon={
                <svg viewBox="0 0 48 48" aria-hidden="true">
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
              }
            >
              Continue with Google
            </BrandButton>

            <BrandButton
              disabled
              icon={
                <svg viewBox="0 0 23 23" aria-hidden="true">
                  <path fill="#F35325" d="M1 1h10v10H1z" />
                  <path fill="#81BC06" d="M12 1h10v10H12z" />
                  <path fill="#05A6F0" d="M1 12h10v10H1z" />
                  <path fill="#FFBA08" d="M12 12h10v10H12z" />
                </svg>
              }
            >
              Microsoft sign-in (coming soon)
            </BrandButton>

            <Link to="/login" className="block">
              <BrandButton
                icon={<Mail className="h-5 w-5 text-muted-ink" />}
              >
                Sign in with email
              </BrandButton>
            </Link>
          </div>

          <p className="mt-4 max-w-[360px] text-[12px] leading-[1.5] text-muted-ink">
            By clicking Continue to join or sign in, you agree to CareerLink's{" "}
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

          <p className="mt-7 text-base text-ink">
            New to CareerLink?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand hover:underline"
            >
              Join now
            </Link>
          </p>
        </div>

        <div className="flex min-w-0 justify-center md:justify-end">
          <svg
            viewBox="0 0 500 400"
            className="block h-auto w-full max-w-[560px] md:w-[660px] md:max-w-none"
            role="img"
            aria-label="Professional working on a laptop"
          >
            <circle cx="250" cy="200" r="180" fill="#EDF3F8" />
            <rect
              x="380"
              y="80"
              width="90"
              height="230"
              rx="6"
              fill="#f3d9c0"
            />
            <rect x="388" y="95" width="74" height="30" fill="#e28f5f" />
            <rect x="388" y="135" width="74" height="30" fill="#84a98c" />
            <rect x="388" y="175" width="74" height="30" fill="#c9ada7" />
            <rect x="388" y="215" width="74" height="30" fill="#e28f5f" />
            <circle cx="200" cy="140" r="35" fill="#4a2c1a" />
            <path
              d="M150 260 q50 -60 100 -60 q50 0 60 60 v40 h-160 z"
              fill="#0a66c2"
            />
            <rect
              x="170"
              y="240"
              width="90"
              height="55"
              rx="4"
              fill="#333"
            />
            <rect
              x="175"
              y="245"
              width="80"
              height="45"
              rx="2"
              fill="#edf3f8"
            />
            <path d="M120 340 h280" stroke="#666" strokeWidth="3" />
            <circle cx="120" cy="100" r="18" fill="#e28f5f" />
            <rect x="105" y="115" width="30" height="35" fill="#84a98c" />
          </svg>
        </div>
      </div>
    </section>
  );
}