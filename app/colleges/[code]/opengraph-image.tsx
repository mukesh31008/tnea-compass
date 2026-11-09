import { ImageResponse } from "next/og";

import { getCollegeProfile } from "@/lib/db/queries";

export const runtime = "nodejs";
export const alt = "TNEA Compass college record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const profile = await getCollegeProfile(code.toUpperCase()).catch(() => null);
  const college = profile?.college;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#fbfaf7",
          color: "#151b19",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 54,
              height: 54,
              borderRadius: 14,
              background: "#0d7268",
              color: "#f6fffd",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            TC
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>TNEA Compass</span>
            <span style={{ fontSize: 16, color: "#6a726e" }}>
              Published record, not a prediction
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span
            style={{
              fontSize: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#0d7268",
              fontWeight: 700,
            }}
          >
            TNEA code {code.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 50,
              lineHeight: 1.08,
              fontWeight: 700,
              maxWidth: 960,
            }}
          >
            {college?.name ?? "College record"}
          </span>
          <span style={{ fontSize: 22, color: "#6a726e" }}>
            {college && profile
              ? `${college.district ?? "District not reported"} · ${college.type} · ${profile.totals.branches} programmes`
              : "Cutoffs, seats and reported facilities"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            borderTop: "1px solid #e5e1d9",
            paddingTop: 24,
            fontSize: 18,
            color: "#6a726e",
          }}
        >
          <span>2020–2026 published cutoffs</span>
          <span>·</span>
          <span>Source round and PDF page</span>
          <span>·</span>
          <span>Missing stays Not reported</span>
        </div>
      </div>
    ),
    size,
  );
}
