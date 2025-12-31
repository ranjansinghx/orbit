export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 bg-ink/90 backdrop-blur-sm border-b border-line px-5 py-4 flex items-center justify-between">
      <div>
        <h1 className="font-display italic text-2xl leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-muted font-mono mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
