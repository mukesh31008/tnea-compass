/**
 * Monthly source check. It does not change the dataset: it warns when a
 * document URL stops resolving, when a hash no longer matches, or when the
 * committed dataset is old enough that a fresh ingest should be reviewed.
 *
 * Usage:
 *   npm run data:check
 *   npm run data:check -- --hash   # downloads each PDF and verifies SHA-256
 */
import { createHash } from "node:crypto";

import seedManifest from "../data/seed/manifest.json";
import { db } from "../lib/db";
import { sourceDocuments } from "../lib/db/schema";

const verifyHashes = process.argv.includes("--hash");
const MAX_AGE_DAYS = 45;

function daysSince(dateText: string): number | null {
  const time = Date.parse(dateText);
  if (Number.isNaN(time)) return null;
  return Math.floor((Date.now() - time) / 86_400_000);
}

async function main() {
  const documents = await db.select().from(sourceDocuments);
  if (documents.length === 0) {
    console.error("No source documents found. Is DATABASE_URL set?");
    process.exitCode = 1;
    return;
  }

  let failures = 0;
  for (const document of documents) {
    const label = `${document.year}${document.round ? ` R${document.round}` : ""} · ${document.title}`;
    try {
      if (verifyHashes) {
        const response = await fetch(document.url, {
          signal: AbortSignal.timeout(90_000),
        });
        if (!response.ok) {
          failures += 1;
          console.error(`FAIL ${label}: HTTP ${response.status}`);
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const actual = createHash("sha256").update(buffer).digest("hex");
        if (actual !== document.sha256) {
          failures += 1;
          console.error(
            `FAIL ${label}: SHA-256 changed\n  expected ${document.sha256}\n  actual   ${actual}`,
          );
        } else {
          console.log(`OK   ${label}: hash matches`);
        }
      } else {
        const response = await fetch(document.url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          failures += 1;
          console.error(`FAIL ${label}: HTTP ${response.status}`);
        } else {
          console.log(
            `OK   ${label}: reachable${response.headers.get("content-length") ? ` (${response.headers.get("content-length")} bytes)` : ""}`,
          );
        }
      }
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${label}: ${(error as Error).message}`);
    }
  }

  const age = daysSince(seedManifest.generatedAt);
  if (age !== null && age > MAX_AGE_DAYS) {
    console.warn(
      `\nWARN dataset generatedAt is ${seedManifest.generatedAt} (${age} days old). Review the official portal for a new round or revised list.`,
    );
  } else if (age !== null) {
    console.log(`\nDataset generatedAt ${seedManifest.generatedAt} (${age} days old).`);
  }

  if (failures > 0) {
    console.error(`\n${failures} source check${failures === 1 ? "" : "s"} failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll source checks passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
