#!/usr/bin/env node
// Copies the freshly built dist/ output into the WordPress theme's build/
// directory, deleting whatever was there first so no stale/orphaned hashed
// assets (old index-<hash>.js/css) are ever left behind. Run via
// `npm run build:wp` (build + sync) — never invoked directly against a
// stale dist/, since `build:wp` always runs `vite build` first.
//
// Cross-platform on purpose (fs.rmSync/fs.cpSync, no shell rm/cp) so this
// works the same on Windows, macOS, and Linux/CI without relying on the
// shell that happens to run "npm run".

import { existsSync, rmSync, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../..");
const distDir = resolve(projectRoot, "dist");
const themeBuildDir = resolve(projectRoot, "wordpress-theme/optivax-react-theme/build");

function fail(message) {
  console.error(`[sync-wp-theme] ${message}`);
  process.exit(1);
}

if (!existsSync(distDir)) {
  fail(`dist/ not found at ${distDir} — run "vite build" first (this script is meant to run after it, via "npm run build:wp").`);
}

if (existsSync(themeBuildDir)) {
  rmSync(themeBuildDir, { recursive: true, force: true });
}
mkdirSync(themeBuildDir, { recursive: true });

cpSync(distDir, themeBuildDir, { recursive: true });

console.log(`[sync-wp-theme] Synced ${distDir} -> ${themeBuildDir}`);
