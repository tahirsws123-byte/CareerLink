import { Play } from "lucide-react";

export default function VideoSection() {
  return (
    <section className="w-full bg-sky">
      <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div className="relative aspect-video w-full overflow-hidden rounded bg-neutral-800">
          <div className="flex h-full w-full items-center justify-center text-center text-white">
            <div>
              <button
                type="button"
                aria-label="Play featured member story"
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/60 transition hover:bg-white/10"
              >
                <Play size={20} />
              </button>

              <p className="mt-3 text-sm font-medium">
                Featured member story
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-normal text-ink md:text-[28px]">
            In it to chase my dream
          </h2>

          <p className="mt-3 text-sm text-muted-ink">
            Check out Gayatri's story of taking a new leap on CareerLink.
          </p>
        </div>
      </div>
    </section>
  );
}