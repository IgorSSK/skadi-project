#!/usr/bin/env node
// Minimal adaptive publish script.
// Rule precedence:
// 1. pkg.skadiRegistry = "npm" | "github"
// 2. publishConfig.registry (contains registry.npmjs.org => npm)
// 3. default => github
// Build is executed once unless SKADI_SKIP_BUILD=1

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const packagesDir = join(root, "packages");

const dirEntries = readdirSync(packagesDir).filter((e) => {
	try {
		return statSync(join(packagesDir, e)).isDirectory();
	} catch {
		return false;
	}
});

const pkgs = dirEntries.flatMap((name) => {
	const dir = join(packagesDir, name);
	try {
		const json = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
		if (json.private) return [];
		return [{ dir, json }];
	} catch {
		return [];
	}
});

if (pkgs.length === 0) {
	console.log("No public packages to publish.");
	process.exit(0);
}

const plan = { npm: [], github: [] };
for (const { dir, json } of pkgs) {
	let target;
	if (json.skadiRegistry === "npm") target = "npm";
	else if (json.skadiRegistry === "github") target = "github";
	else if (json.publishConfig?.registry?.includes("registry.npmjs.org")) target = "npm";
	else target = "github";
	plan[target].push({ name: json.name, dir });
}

// Detect .npmrc scope overrides that might conflict
let scopeOverrideWarn = false;
const npmrcPath = join(root, ".npmrc");
let npmrcContent = "";
if (existsSync(npmrcPath)) {
	try {
		npmrcContent = readFileSync(npmrcPath, "utf8");
	} catch {}
}
if (npmrcContent.includes("@skadi:registry=") && plan.npm.some((p) => p.name.startsWith("@skadi/"))) {
	scopeOverrideWarn = true;
}

console.log("Publish plan:");
for (const k of Object.keys(plan)) {
	if (plan[k].length) console.log("  " + k + ": " + plan[k].map((p) => p.name).join(", "));
}
if (!plan.npm.length && !plan.github.length) {
	console.log("Nothing to publish.");
	process.exit(0);
}

function run(cmd, opts) {
	console.log("$ " + cmd);
	execSync(cmd, { stdio: "inherit", ...opts });
}

if (process.env.SKADI_SKIP_BUILD !== "1") {
	console.log("Building (pnpm build)...");
	run("pnpm build");
}

// Helper to inject token per publish.
const npmToken = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN;
const ghToken = process.env.GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN;

if (plan.npm.length && !npmToken) {
	console.warn("Warning: npm packages to publish but no NPM_TOKEN provided. They may fail.");
}
if (plan.github.length && !ghToken) {
	console.warn("Warning: github packages to publish but no GITHUB_TOKEN provided. They may fail.");
}

if (scopeOverrideWarn) {
	console.warn(
		"Notice: .npmrc contains '@skadi:registry' pointing to GitHub; using explicit --registry for npm publishes to override.",
	);
}

// Temporarily disable root .npmrc if it forces @skadi scope to GitHub and we have npm publishes
let npmrcTemporarilyMoved = false;
const npmrcBackupPath = npmrcPath + ".bak";
if (scopeOverrideWarn && plan.npm.length && existsSync(npmrcPath)) {
	try {
		renameSync(npmrcPath, npmrcBackupPath);
		npmrcTemporarilyMoved = true;
		console.log("Temporarily moved .npmrc to avoid scope override for npm publishes.");
	} catch (e) {
		console.warn("Could not move .npmrc; publish may still target GitHub for scoped packages.", e);
	}
}

try {
	for (const p of plan.npm) {
		run("npm publish --access public --registry=https://registry.npmjs.org", {
			cwd: p.dir,
			env: { ...process.env, NODE_AUTH_TOKEN: npmToken, NPM_CONFIG_REGISTRY: "https://registry.npmjs.org" },
		});
	}
} finally {
	if (npmrcTemporarilyMoved) {
		try {
			renameSync(npmrcBackupPath, npmrcPath);
			console.log("Restored .npmrc after npm publishes.");
		} catch (e) {
			console.warn("Failed to restore original .npmrc", e);
		}
	}
}
for (const p of plan.github) {
	run("npm publish --access public --registry=https://npm.pkg.github.com", {
		cwd: p.dir,
		env: { ...process.env, NODE_AUTH_TOKEN: ghToken },
	});
}

console.log("Done.");
