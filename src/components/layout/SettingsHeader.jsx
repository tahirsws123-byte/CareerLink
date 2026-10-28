import { Link } from "react-router-dom";
import MeDropdown from "./MeDropdown";

export default function SettingsHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-[66px] items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-8">
      <Link to="/feed" aria-label="CareerLink home" className="text-2xl font-bold tracking-tight text-brand">
        Career<span className="text-ink">Link</span>
      </Link>
      <MeDropdown compact />
    </header>
  );
}
