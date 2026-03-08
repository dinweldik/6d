#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface CliOptions {
  readonly version: string | null;
  readonly bump: "patch" | "minor" | "major";
  readonly tag: string;
  readonly access: string;
  readonly dryRun: boolean;
  readonly verbose: boolean;
  readonly provenance: boolean;
  readonly otp: string | null;
}

function fail(message: string): never {
  throw new Error(`[publish-npm] ${message}`);
}

function runCommand(command: string, args: ReadonlyArray<string>, cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function parseArgs(argv: ReadonlyArray<string>): CliOptions {
  let version: string | null = null;
  let bump: CliOptions["bump"] = "patch";
  let tag = "latest";
  let access = "public";
  let dryRun = false;
  let verbose = false;
  let provenance = false;
  let otp: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case "--version":
        if (!next) fail("Missing value for --version.");
        version = next;
        index += 1;
        break;
      case "--bump":
        if (next !== "patch" && next !== "minor" && next !== "major") {
          fail("Expected --bump patch|minor|major.");
        }
        bump = next;
        index += 1;
        break;
      case "--tag":
        if (!next) fail("Missing value for --tag.");
        tag = next;
        index += 1;
        break;
      case "--access":
        if (!next) fail("Missing value for --access.");
        access = next;
        index += 1;
        break;
      case "--otp":
        if (!next) fail("Missing value for --otp.");
        otp = next;
        index += 1;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--verbose":
        verbose = true;
        break;
      case "--provenance":
        provenance = true;
        break;
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }

  return {
    version,
    bump,
    tag,
    access,
    dryRun,
    verbose,
    provenance,
    otp,
  };
}

function bumpVersion(currentVersion: string, bump: CliOptions["bump"]): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion.trim());
  if (!match) {
    fail(`Current version is not a plain semver version: ${currentVersion}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  switch (bump) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const serverDir = path.join(repoRoot, "apps", "server");
  const packageJsonPath = path.join(serverDir, "package.json");
  const originalPackageJsonRaw = readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(originalPackageJsonRaw) as {
    name: string;
    version: string;
  };

  if ((process.env.NPM_TOKEN?.trim() ?? "").length === 0) {
    fail("NPM_TOKEN is not set in the current shell.");
  }

  const nextVersion = options.version ?? bumpVersion(packageJson.version, options.bump);
  const nextPackageJsonRaw = `${JSON.stringify({ ...packageJson, version: nextVersion }, null, 2)}\n`;

  if (packageJson.version === nextVersion) {
    console.log(`[publish-npm] Reusing version ${nextVersion}`);
  } else {
    console.log(`[publish-npm] Bumping ${packageJson.name} from ${packageJson.version} to ${nextVersion}`);
  }

  writeFileSync(packageJsonPath, nextPackageJsonRaw);

  let published = false;

  try {
    runCommand("bun", ["lint"], repoRoot);
    runCommand("bun", ["typecheck"], repoRoot);
    runCommand("bun", ["run", "build"], repoRoot);
    runCommand("node", ["scripts/cli.ts", "build", "--verbose"], serverDir);

    const publishArgs = [
      "scripts/cli.ts",
      "publish",
      "--tag",
      options.tag,
      "--access",
      options.access,
      "--app-version",
      nextVersion,
    ];
    if (options.verbose) {
      publishArgs.push("--verbose");
    }
    if (options.dryRun) {
      publishArgs.push("--dry-run");
    }
    if (options.provenance) {
      publishArgs.push("--provenance");
    }
    if (options.otp) {
      publishArgs.push("--otp", options.otp);
    }

    runCommand("node", publishArgs, serverDir);
    published = true;
    console.log(`[publish-npm] Published ${packageJson.name}@${nextVersion}`);
  } finally {
    if (!published) {
      writeFileSync(packageJsonPath, originalPackageJsonRaw);
      console.log("[publish-npm] Restored apps/server/package.json after failed publish.");
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
