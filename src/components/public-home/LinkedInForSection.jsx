import { ChevronRight } from "lucide-react";

const options = [
  "Find a coworker or classmate",
  "Find a new job",
  "Find a course or training",
];

export default function LinkedInForSection() {
  return (
    <section className="w-full">
      <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-center gap-8 px-6 py-16 md:grid-cols-2">
        <div className="rounded-lg bg-warm p-6 sm:p-8">
          <h2 className="text-2xl font-normal text-accent-red md:text-[28px]">
            Who is CareerLink for?
          </h2>

          <p className="mt-2 text-sm text-muted-ink">
            Anyone looking to make gains in their professional life.
          </p>

          <div className="mt-6 space-y-3">
            {options.map((label) => (
              <button
                type="button"
                key={label}
                className="flex min-h-[48px] w-full items-center justify-between rounded-md border border-line bg-white px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-black/5"
              >
                <span>{label}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="flex h-[280px] w-[280px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-300 to-amber-500 md:h-[360px] md:w-[360px]">
            <svg
              viewBox="0 0 300 300"
              className="block h-full w-full"
              aria-hidden="true"
            >
              <rect
                width="300"
                height="300"
                fill="#c47a3d"
                opacity="0.4"
              />
              <circle cx="110" cy="130" r="35" fill="#4a2c1a" />
              <path
                d="M60 300 q50 -100 100 -100 q50 0 60 100z"
                fill="#3b5998"
              />
              <circle cx="210" cy="130" r="35" fill="#5a3a24" />
              <path
                d="M160 300 q50 -100 100 -100 q40 0 50 100z"
                fill="#7a9d4a"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}