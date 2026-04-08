#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cwd = process.cwd();
const drizzleBinPath = resolve(cwd, "node_modules/drizzle-kit/bin.cjs");
const drizzleConfigPath = resolve(cwd, "drizzle.config.ts");
const migrationMetaDir = resolve(cwd, "drizzle/migrations/meta");
const schemaPath = resolve(cwd, "db/schema/index.ts");

function fail(message, details) {
  console.error(`[db:parity] ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function findLatestSnapshotPath(metaDir) {
  if (!existsSync(metaDir)) {
    return null;
  }

  const snapshotFiles = readdirSync(metaDir)
    .filter((fileName) => fileName.endsWith("_snapshot.json"))
    .sort();

  if (snapshotFiles.length === 0) {
    return null;
  }

  return resolve(metaDir, snapshotFiles[snapshotFiles.length - 1]);
}

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(
      entries.map(([key, nestedValue]) => [key, sortDeep(nestedValue)]),
    );
  }

  return value;
}

function normalizeSnapshot(rawSnapshot) {
  const { id, prevId, ...stablePayload } = rawSnapshot;
  void id;
  void prevId;
  return sortDeep(stablePayload);
}

if (!existsSync(drizzleBinPath)) {
  fail(
    "Could not find drizzle-kit binary. Install dependencies before running parity checks.",
  );
}

if (!existsSync(drizzleConfigPath)) {
  fail(
    "Could not find drizzle.config.ts. Run this command from the project root.",
  );
}

if (!existsSync(schemaPath)) {
  fail("Could not find db/schema/index.ts used by Drizzle schema generation.");
}

const committedSnapshotPath = findLatestSnapshotPath(migrationMetaDir);
if (!committedSnapshotPath) {
  fail("No committed Drizzle snapshot found under drizzle/migrations/meta.");
}

const tempRoot = mkdtempSync(join(tmpdir(), "drizzle-parity-"));
const tempOutDir = resolve(tempRoot, "migrations");
const tempConfigPath = resolve(tempRoot, "drizzle.parity.config.ts");

try {
  writeFileSync(
    tempConfigPath,
    [
      "export default {",
      `  schema: ${JSON.stringify(schemaPath)},`,
      `  out: ${JSON.stringify(tempOutDir)},`,
      '  dialect: "postgresql",',
      "  dbCredentials: {",
      '    url: process.env.DIRECT_DATABASE_URL ?? "",',
      "  },",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );

  const generateResult = spawnSync(
    process.execPath,
    [drizzleBinPath, "generate", "--config", tempConfigPath],
    {
      cwd,
      encoding: "utf8",
    },
  );

  if (generateResult.status !== 0) {
    fail(
      "drizzle-kit generate failed while preparing parity snapshot.",
      `${generateResult.stdout ?? ""}${generateResult.stderr ?? ""}`.trim(),
    );
  }

  const generatedSnapshotPath = findLatestSnapshotPath(
    resolve(tempOutDir, "meta"),
  );
  if (!generatedSnapshotPath) {
    fail("Could not locate generated snapshot in temporary output folder.");
  }

  const committedSnapshot = normalizeSnapshot(
    JSON.parse(readFileSync(committedSnapshotPath, "utf8")),
  );
  const generatedSnapshot = normalizeSnapshot(
    JSON.parse(readFileSync(generatedSnapshotPath, "utf8")),
  );

  const committedSerialized = JSON.stringify(committedSnapshot);
  const generatedSerialized = JSON.stringify(generatedSnapshot);

  if (committedSerialized !== generatedSerialized) {
    fail(
      "Schema drift detected: current Drizzle schema does not match the latest committed migration snapshot.",
      "Run 'pnpm db:generate', review the new migration, and commit it.",
    );
  }

  console.log(
    "[db:parity] Drizzle schema and committed migration snapshot are in parity.",
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
