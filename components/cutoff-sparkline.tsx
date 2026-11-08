import { CUTOFF_YEARS } from "@/lib/tnea";

/**
 * A small server-rendered sparkline for published cutoff marks. Missing
 * values break the line instead of being drawn as an invented value. The
 * labels default to the counselling years, but a 2026 row passes R1–R3 so the
 * sparkline never mixes allotted-community rounds with candidate-community
 * year marks.
 */
export function CutoffSparkline({
  values,
  label,
  labels = CUTOFF_YEARS,
  width = 92,
}: {
  values: (number | null)[];
  label: string;
  labels?: readonly (string | number)[];
  width?: number;
}) {
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
      value === null ? null : `${labels[index] ?? index + 1}: ${value.toFixed(1)}`,
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
