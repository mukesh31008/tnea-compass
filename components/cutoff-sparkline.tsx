import { CUTOFF_YEARS } from "@/lib/tnea";

/**
 * A small server-rendered sparkline for six years of cutoff marks. Missing
 * years break the line instead of being drawn as an invented value.
 */
export function CutoffSparkline({
  values,
  label,
}: {
  values: (number | null)[];
  label: string;
}) {
  const width = 92;
  const height = 26;
  const padding = 3;
  const step = (width - padding * 2) / Math.max(1, values.length - 1);

  let path = "";
  let drawing = false;
  const points: { x: number; y: number }[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    const x = padding + index * step;
    const y = padding + (1 - Math.min(Math.max(value, 0), 200) / 200) * (height - padding * 2);
    path += `${drawing ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
    drawing = true;
    points.push({ x, y });
  });

  const summary = values
    .map((value, index) =>
      value === null ? null : `${CUTOFF_YEARS[index]}: ${value.toFixed(1)}`,
    )
    .filter(Boolean)
    .join(" · ");

  if (points.length === 0) {
    return <span className="text-[11px] text-muted-foreground/60">—</span>;
  }

  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${label}. ${summary}`}
      className="overflow-visible text-primary"
    >
      <title>{summary || label}</title>
      <path
        d={path.trim()}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={2} fill="currentColor" />
    </svg>
  );
}
