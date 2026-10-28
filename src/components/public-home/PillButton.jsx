const styles = {
  outline:
    "border border-brand text-brand hover:bg-brand/10 active:bg-brand/20 px-6 py-1 font-semibold text-[15px]",

  filled:
    "bg-brand text-white hover:bg-brand-hover active:bg-[#003366] px-6 py-1 font-semibold text-[15px]",

  ghost:
    "text-ink hover:bg-black/5 active:bg-black/10 px-4 py-1 font-medium text-[15px]",

  chip:
    "border border-muted-ink/60 text-muted-ink hover:bg-black/5 active:bg-black/10 px-3 py-1 text-[14px]",

  chipOutline:
    "border border-brand text-brand hover:bg-brand/10 active:bg-brand/20 px-4 py-1 text-[14px] font-semibold",
};

export default function PillButton({
  variant = "outline",
  className = "",
  children,
  as = "button",
  ...rest
}) {
  const Component = as;

  return (
    <Component
      className={`inline-flex min-h-[32px] items-center justify-center rounded-full transition-colors ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}