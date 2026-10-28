import PillButton from "./PillButton.jsx";

export default function PostJobSection() {
  return (
    <section className="w-full bg-warm">
      <div className="mx-auto flex w-full max-w-[1128px] flex-col items-center gap-5 px-6 py-14 text-center">
        <h2 className="text-2xl font-normal leading-tight text-accent-red md:text-[28px]">
          Post your job for millions of people to see
        </h2>

        <PillButton variant="chipOutline">
          Post a job
        </PillButton>
      </div>
    </section>
  );
}