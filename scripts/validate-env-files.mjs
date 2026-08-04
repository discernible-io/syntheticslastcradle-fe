#!/usr/bin/env node
/**
 * Pre-build validation for public tier env files (.env.main / .env.development).
 * Usage: node scripts/validate-env-files.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DOCUMENTED_KEYS = [
  "REACT_APP_DEPLOY_LABEL",
  "REACT_APP_PUBLIC_ORIGIN",
  "REACT_APP_API_BASE",
  "REACT_APP_VERIFY_ORIGIN",
  "REACT_APP_ENROLL_URL",
  "REACT_APP_DOCS_SITE_URL",
  "REACT_APP_SKILL_URL",
  "REACT_APP_PEER_AUTH_URL",
  "REACT_APP_POLL_INTERVAL_MS",
  "REACT_APP_TITLE",
  "REACT_APP_LOG_LEVEL",
  "REACT_APP_NEAR_CONTRACT_ID",
  "REACT_APP_NEAR_NETWORK",
  "REACT_APP_NEAR_RPC_URL",
];

const TIER_DEPLOY_LABEL = {
  ".env.main": "@mainnet",
  ".env.development": "@development",
};

const PLACEHOLDER_PATTERNS = [
  /example\.(com|org|net)/i,
  /placeholder/i,
  /changeme/i,
  /\bTODO\b/i,
  /^YOUR_/i,
  /localhost/i,
  /127\.0\.0\.1/,
];

function parseEnvFile(path) {
  const vars = {};
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function fail(file, key, message) {
  return { file, key, message };
}

function validateHttpsUrl(value, { allowPath = true } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "must be a valid URL";
  }
  if (url.protocol !== "https:") return "must use https";
  if (!allowPath && value.endsWith("/")) return "must not end with /";
  return null;
}

function looksLikePlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function validateVars(fileLabel, vars) {
  const errors = [];

  for (const key of DOCUMENTED_KEYS) {
    if (!(key in vars)) {
      errors.push(fail(fileLabel, key, "missing"));
    }
  }
  for (const key of Object.keys(vars)) {
    if (!DOCUMENTED_KEYS.includes(key)) {
      errors.push(fail(fileLabel, key, "present but not documented"));
    }
  }

  const check = (key, fn) => {
    if (!(key in vars)) return;
    const msg = fn(vars[key]);
    if (msg) errors.push(fail(fileLabel, key, msg));
  };

  check("REACT_APP_DEPLOY_LABEL", (v) =>
    !v.startsWith("@") ? "should start with @ (e.g. @mainnet)" : null
  );
  check("REACT_APP_PUBLIC_ORIGIN", (v) => validateHttpsUrl(v, { allowPath: false }));
  check("REACT_APP_API_BASE", (v) => validateHttpsUrl(v));
  check("REACT_APP_VERIFY_ORIGIN", (v) => validateHttpsUrl(v, { allowPath: false }));
  check("REACT_APP_ENROLL_URL", (v) => validateHttpsUrl(v));
  check("REACT_APP_DOCS_SITE_URL", (v) => validateHttpsUrl(v, { allowPath: false }));
  check("REACT_APP_SKILL_URL", (v) => validateHttpsUrl(v));
  check("REACT_APP_PEER_AUTH_URL", (v) => validateHttpsUrl(v));
  check("REACT_APP_POLL_INTERVAL_MS", (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1000) return "must be an integer >= 1000";
    return null;
  });
  check("REACT_APP_TITLE", (v) => (!v.trim() ? "must be non-empty" : null));
  check("REACT_APP_LOG_LEVEL", (v) =>
    !["error", "warn", "info", "debug", "trace"].includes(v)
      ? "expected logger level: error, warn, info, debug, or trace"
      : null
  );
  check("REACT_APP_NEAR_CONTRACT_ID", (v) => {
    if (!v.trim()) return "must be non-empty";
    if (!/^[a-z0-9._-]+$/.test(v)) return "must look like a NEAR account id";
    return null;
  });
  check("REACT_APP_NEAR_NETWORK", (v) =>
    !["mainnet", "testnet"].includes(v) ? "expected mainnet or testnet" : null
  );
  check("REACT_APP_NEAR_RPC_URL", (v) => validateHttpsUrl(v));

  const expected = TIER_DEPLOY_LABEL[fileLabel];
  if (expected && vars.REACT_APP_DEPLOY_LABEL && vars.REACT_APP_DEPLOY_LABEL !== expected) {
    errors.push(
      fail(fileLabel, "REACT_APP_DEPLOY_LABEL", `expected ${expected}, got ${vars.REACT_APP_DEPLOY_LABEL}`)
    );
  }

  if (fileLabel === ".env.main") {
    for (const key of ["REACT_APP_PUBLIC_ORIGIN", "REACT_APP_API_BASE", "REACT_APP_VERIFY_ORIGIN"]) {
      const value = vars[key];
      if (value && looksLikePlaceholder(value)) {
        errors.push(fail(fileLabel, key, "looks like a placeholder on main"));
      }
    }
  }

  return errors;
}

const allErrors = [
  ...validateVars(".env.main", parseEnvFile(join(root, ".env.main"))),
  ...validateVars(".env.development", parseEnvFile(join(root, ".env.development"))),
];

if (allErrors.length === 0) {
  console.log(
    `OK: ${DOCUMENTED_KEYS.length} documented variables present and valid in both .env.main and .env.development.`
  );
  process.exit(0);
}

console.error("Environment validation failed:\n");
for (const { file, key, message } of allErrors) {
  console.error(`  ${file}  ${key}: ${message}`);
}
process.exit(1);
