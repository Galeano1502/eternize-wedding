export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="bg-card border border-dashed border-theme rounded-2xl p-10 text-center flex flex-col items-center justify-center my-4">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-subtle flex items-center justify-center mb-4 text-ink">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-xl font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 transition cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
