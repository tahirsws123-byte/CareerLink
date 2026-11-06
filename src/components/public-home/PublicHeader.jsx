import { Link } from "react-router-dom";
import {
  Briefcase,
  Building2,
  Users,
} from "lucide-react";
import PillButton from "./PillButton.jsx";

const navItems = [
  { icon: Users, label: "People", to: "/network" },
  { icon: Building2, label: "Companies", to: "/company-pages/discover" },
  { icon: Briefcase, label: "Jobs", to: "/jobs" },
];

export default function PublicHeader() {
  return (
    <header className="careerlink-header sticky top-0 z-50 w-full border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[64px] w-full max-w-[1128px] items-center justify-between px-2 min-[360px]:px-4 sm:px-6">
        <Link
          to="/"
          className="text-[22px] font-bold leading-none tracking-tight text-brand min-[360px]:text-[26px]"
          aria-label="CareerLink homepage"
        >
          Career<span className="text-ink">Link</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navItems.map(({ icon: Icon, label, to }) => (
            <Link
              key={label}
              to={to}
              className="flex min-w-[68px] flex-col items-center rounded px-2 py-1 text-[12px] text-muted-ink transition hover:text-ink"
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="mt-0.5 whitespace-nowrap leading-tight">
                {label}
              </span>
            </Link>
          ))}

          <Link to="/register" className="ml-3">
            <PillButton
              as="span"
              variant="chipOutline"
              className="px-6 py-2"
            >
              Join now
            </PillButton>
          </Link>

          <Link to="/login" className="ml-2">
            <PillButton
              as="span"
              variant="filled"
              className="px-6 py-2"
            >
              Sign in
            </PillButton>
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Link to="/register">
            <PillButton as="span" variant="chipOutline" className="px-2 min-[360px]:px-4">
              Join now
            </PillButton>
          </Link>

          <Link to="/login">
            <PillButton as="span" variant="filled" className="px-3 min-[360px]:px-6">
              Sign in
            </PillButton>
          </Link>
        </div>
      </div>
    </header>
  );
}