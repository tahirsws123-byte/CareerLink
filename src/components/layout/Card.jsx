const Card = ({
  children,
  className = "",
  as: Tag = "section",
  ...props
}) => {
  return (
    <Tag
      {...props}
      className={`rounded-lg border border-line bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02)] ${className}`}
    >
      {children}
    </Tag>
  );
};

export default Card;