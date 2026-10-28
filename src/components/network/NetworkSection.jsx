import Card from "../layout/Card";

export default function NetworkSection({
  title,
  description,
  count,
  headerAction,
  empty,
  children,
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-ink">{description}</p>
          )}
        </div>

        {headerAction || (typeof count === "number" && (
          <span className="text-sm font-semibold text-brand">{count}</span>
        ))}
      </div>

      {hasChildren ? children : (
        <div className="border-t border-gray-100 px-4 py-6 text-sm text-muted-ink">
          {empty}
        </div>
      )}
    </Card>
  );
}
