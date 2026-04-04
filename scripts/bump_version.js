#!/usr/bin/env node
/**
 * bump_version.js — bumps the app version across app.config.ts, package.json,
 * and ios/Illusi/Info.plist in one shot.
 *
 * Usage:
 *   node scripts/bump_version.js          # patch bump (default)
 *   node scripts/bump_version.js patch    # 20.1.6 → 20.1.7
 *   node scripts/bump_version.js minor    # 20.1.6 → 20.2.0
 *   node scripts/bump_version.js major    # 20.1.6 → 21.0.0
 *   node scripts/bump_version.js 20.2.1   # explicit version
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function parseVersion(v) {
  const parts = v.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error(`Cannot parse version: ${v}`);
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bump(current, type) {
  if (/^\d+\.\d+\.\d+$/.test(type)) return type; // explicit version
  const v = parseVersion(current);
  if (type === 'major') return `${v.major + 1}.0.0`;
  if (type === 'minor') return `${v.major}.${v.minor + 1}.0`;
  if (type === 'patch') return `${v.major}.${v.minor}.${v.patch + 1}`;
  throw new Error(`Unknown bump type "${type}". Use patch | minor | major | X.Y.Z`);
}

const bumpType = process.argv[2] || 'patch';

// ── package.json ────────────────────────────────────────────────────────────
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const current = pkg.version;
const next = bump(current, bumpType);

if (current === next) {
  console.log(`Version is already ${current}, nothing to do.`);
  process.exit(0);
}

console.log(`\nBumping ${current} → ${next}\n`);

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓  package.json');

// ── app.config.ts ────────────────────────────────────────────────────────────
const appConfigPath = path.join(ROOT, 'app.config.ts');
let appConfig = fs.readFileSync(appConfigPath, 'utf8');
const newAppConfig = appConfig.replace(
  /"version": "\d+\.\d+\.\d+"/,
  `"version": "${next}"`
);
if (newAppConfig === appConfig) {
  console.error('✗  app.config.ts — version field not found, skipping');
} else {
  fs.writeFileSync(appConfigPath, newAppConfig);
  console.log('✓  app.config.ts');
}

// ── ios/Illusi/Info.plist ────────────────────────────────────────────────────
const plistPath = path.join(ROOT, 'ios/Illusi/Info.plist');
let plist = fs.readFileSync(plistPath, 'utf8');
const newPlist = plist.replace(
  /(<key>CFBundleShortVersionString<\/key>\s*<string>)\d+\.\d+\.\d+(<\/string>)/,
  `$1${next}$2`
);
if (newPlist === plist) {
  console.error('✗  Info.plist — CFBundleShortVersionString not found, skipping');
} else {
  fs.writeFileSync(plistPath, newPlist);
  console.log('✓  ios/Illusi/Info.plist');
}

console.log(`\nDone — version is now ${next}`);
