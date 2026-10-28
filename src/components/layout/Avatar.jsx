const Avatar = ({
  initials,
  color,
  size = 48,
  className = "",
  ring = false,
}) => {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        ring ? "ring-2 ring-white" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(11, Math.round(size * 0.4)),
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

export default Avatar;