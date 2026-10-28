import { Link } from "react-router-dom";
import PillButton from "./PillButton.jsx";

export default function FinalCTA() {
  return (
    <section className="relative w-full overflow-hidden bg-sky">
      <div className="relative z-10 mx-auto flex min-h-[340px] w-full max-w-[1128px] flex-col items-start gap-6 px-6 pb-40 pt-20 md:min-h-[420px] md:pb-48 md:pt-24">
        <h2 className="max-w-[640px] text-[28px] font-light leading-[1.15] text-accent-red md:text-[40px]">
          Join your colleagues, classmates, and friends on CareerLink
        </h2>

        <Link to="/register">
          <PillButton
            as="span"
            variant="filled"
            className="px-7 py-2 text-base"
          >
            Get started
          </PillButton>
        </Link>
      </div>

      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-[140px] w-full md:h-[180px]"
        aria-hidden="true"
      >
        <rect y="160" width="1440" height="40" fill="#d7e3ee" />

        <g fill="#b7cadb">
          <rect x="120" y="80" width="140" height="80" />
          <rect x="300" y="40" width="180" height="120" />
          <rect x="520" y="20" width="220" height="140" />
          <rect x="780" y="60" width="160" height="100" />
          <rect x="980" y="30" width="200" height="130" />
          <rect x="1220" y="90" width="150" height="70" />
        </g>
      </svg>
    </section>
  );
}