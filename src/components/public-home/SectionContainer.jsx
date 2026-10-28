export default function SectionContainer({
  children,
  className = "",
  bg = "",
  as: Tag = "section",
  id,
}) {
  return (
    <Tag id={id} className={`w-full ${bg}`}>
      <div
        className={`mx-auto w-full max-w-[1128px] px-6 py-10 md:py-14 ${className}`}
      >
        {children}
      </div>
    </Tag>
  );
}