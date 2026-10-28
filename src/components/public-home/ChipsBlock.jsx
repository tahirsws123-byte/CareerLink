import PillButton from "./PillButton.jsx";

export default function ChipsBlock({
  title,
  subtitle,
  chips,
  ctaLabel,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[340px_1fr] md:gap-12">
      <div>
        <h2 className="text-[24px] font-light leading-[1.2] text-accent-red md:text-[32px]">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-3 text-[14px] leading-relaxed text-muted-ink">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {chips.map((chip) => (
          <PillButton key={chip} variant="chip">
            {chip}
          </PillButton>
        ))}

        {ctaLabel && (
          <div className="mt-3 w-full">
            <PillButton variant="chipOutline">
              {ctaLabel}
            </PillButton>
          </div>
        )}
      </div>
    </div>
  );
}