import { Link } from "react-router-dom";
import {
  Newspaper,
  Users,
  GraduationCap,
  Briefcase,
  Gamepad2,
  Smartphone,
} from "lucide-react";
import PillButton from "./PillButton.jsx";

const navItems = [
  { icon: Newspaper, label: "Top Content" },
  { icon: Users, label: "People" },
  { icon: GraduationCap, label: "Learning" },
  { icon: Briefcase, label: "Jobs" },
  { icon: Gamepad2, label: "Games" },
];

export default function PublicHeader() {
  return (
    <header className="careerlink-header sticky top-0 z-50 w-full border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[64px] w-full max-w-[1128px] items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="text-[26px] font-bold leading-none tracking-tight text-brand"
          aria-label="CareerLink homepage"
        >
          Career<span className="text-ink">Link</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navItems.map(({ icon: Icon, label }) => (
            <a
              key={label}
              href="#"
              className="flex min-w-[68px] flex-col items-center rounded px-2 py-1 text-[12px] text-muted-ink transition hover:text-ink"
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="mt-0.5 whitespace-nowrap leading-tight">
                {label}
              </span>
            </a>
          ))}

          <span
            className="mx-3 h-9 w-px bg-line"
            aria-hidden="true"
          />

          <a
            href="#"
            className="flex min-w-[68px] flex-col items-center rounded px-2 py-1 text-[12px] text-muted-ink transition hover:text-ink"
          >
            <Smartphone size={20} strokeWidth={1.5} />
            <span className="mt-0.5 whitespace-nowrap leading-tight">
              Get the app
            </span>
          </a>

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
            <PillButton as="span" variant="chipOutline">
              Join now
            </PillButton>
          </Link>

          <Link to="/login">
            <PillButton as="span" variant="filled">
              Sign in
            </PillButton>
          </Link>
        </div>
      </div>
    </header>
  );
}