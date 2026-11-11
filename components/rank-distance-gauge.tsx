import * as React from "react";
import { type PositionBand } from "@/lib/predictor";

export function RankDistanceGauge({
  band,
  advantage,
  mode,
}: {
  band: PositionBand;
  advantage: number;
  mode: "rank" | "cutoff";
}) {
  // Normalize visual progress percentage between 0 and 100
  let widthPct = 50;
  if (mode === "rank") {
    if (advantage >= 0) {
      widthPct = Math.min(100, 50 + Math.min(50, (advantage / 10000) * 50));
    } else {
      widthPct = Math.max(5, 50 - Math.min(45, (Math.abs(advantage) / 15000) * 50));
    }
  } else {
    // Cutoff mode
    if (advantage >= 0) {
      widthPct = Math.min(100, 50 + Math.min(50, (advantage / 10) * 50));
    } else {
      widthPct = Math.max(5, 50 - Math.min(45, (Math.abs(advantage) / 10) * 50));
    }
  }

  const barColor =
    band === "comfortable" || band === "likely"
      ? "bg-emerald-500"
      : band === "borderline"
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}
