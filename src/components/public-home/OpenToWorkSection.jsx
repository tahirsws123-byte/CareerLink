import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    title: "Let the right people know you're open to work",
    description:
      "With the Open To Work feature, you can privately tell recruiters or publicly share with your community that you are looking for new opportunities.",
  },
  {
    title: "Share your career goals with your network",
    description:
      "Keep your professional community informed and discover opportunities that match your experience and interests.",
  },
];

export default function OpenToWorkSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((current) => (current + 1) % slides.length);
  };

  const previousSlide = () => {
    setCurrentSlide(
      (current) => (current - 1 + slides.length) % slides.length
    );
  };

  const slide = slides[currentSlide];

  return (
    <section className="w-full bg-warm">
      <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h2 className="max-w-[420px] text-2xl font-normal leading-snug text-accent-red md:text-[28px]">
            {slide.title}
          </h2>

          <p className="mt-4 max-w-[440px] text-sm leading-relaxed text-muted-ink">
            {slide.description}
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous slide"
              className="rounded-full border border-line bg-white p-2 transition hover:bg-black/5"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="rounded-full border border-line bg-white p-2 transition hover:bg-black/5"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <div className="relative flex h-[280px] w-[280px] items-center justify-center rounded-full bg-black md:h-[340px] md:w-[340px]">
            <div className="flex h-[75%] w-[45%] flex-col items-center rounded-[28px] bg-white p-3 shadow-lg">
              <div className="mb-2 text-xs font-bold text-brand">
                CareerLink
              </div>

              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-[#f3d9c0]" />
                <div className="absolute inset-0 rounded-full border-[3px] border-green-600" />
              </div>

              <div className="mt-2 h-2 w-20 rounded bg-black/70" />
              <div className="mt-1 h-1.5 w-16 rounded bg-black/30" />
              <div className="mt-3 h-6 w-24 rounded-full bg-brand" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}