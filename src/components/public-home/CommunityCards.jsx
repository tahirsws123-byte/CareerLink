import { ChevronDown } from "lucide-react";
import PillButton from "./PillButton.jsx";
import SectionContainer from "./SectionContainer.jsx";

export default function CommunityCards() {
  return (
    <SectionContainer>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <article>
          <svg
            viewBox="0 0 300 200"
            className="block h-40 w-full"
            aria-hidden="true"
          >
            <circle cx="150" cy="180" r="8" fill="#84a98c" />
            <circle cx="90" cy="80" r="30" fill="#4a2c1a" />
            <path
              d="M60 200 q30 -60 60 -60 q30 0 40 60z"
              fill="#e28f5f"
            />
            <circle cx="200" cy="90" r="28" fill="#f3d9c0" />
            <path
              d="M170 200 q30 -55 60 -55 q30 0 40 55z"
              fill="#0a66c2"
            />
            <path
              d="M40 50 q20 -30 40 0"
              stroke="#84a98c"
              strokeWidth="6"
              fill="none"
            />
          </svg>

          <h3 className="mt-4 text-xl font-normal text-ink">
            Connect with people who can help
          </h3>

          <div className="mt-4">
            <PillButton variant="chipOutline">
              Find people you know
            </PillButton>
          </div>
        </article>

        <article>
          <svg
            viewBox="0 0 300 200"
            className="block h-40 w-full"
            aria-hidden="true"
          >
            <rect
              x="150"
              y="120"
              width="130"
              height="10"
              fill="#84a98c"
            />
            <rect
              x="160"
              y="80"
              width="110"
              height="45"
              fill="#e28f5f"
            />
            <circle cx="110" cy="90" r="28" fill="#4a2c1a" />
            <path
              d="M75 200 q35 -60 70 -60 q35 0 45 60z"
              fill="#c9ada7"
            />
            <rect
              x="200"
              y="60"
              width="55"
              height="25"
              fill="#0a66c2"
            />
          </svg>

          <h3 className="mt-4 text-xl font-normal text-ink">
            Learn the skills you need to succeed
          </h3>

          <button
            type="button"
            className="mt-4 flex min-h-[44px] w-full max-w-[320px] items-center justify-between rounded-full border border-line bg-white px-4 py-2 text-sm text-ink transition hover:bg-black/5"
          >
            <span>Choose a topic to learn about</span>
            <ChevronDown size={16} />
          </button>
        </article>
      </div>
    </SectionContainer>
  );
}