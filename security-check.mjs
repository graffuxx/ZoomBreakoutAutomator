import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const filesToScan = [
  "app.js",
  "src/worker.js",
  "index.html",
  "privacy.html",
  "terms.html",
  "support.html",
  "documentation.html",
  "wrangler.jsonc",
  "_headers",
];

const secretPatterns = [
  /client[_-]?secret\s*[:=]\s*["'][^"']{8,}/i,
  /access[_-]?token\s*[:=]\s*["'][^"']{8,}/i,
  /refresh[_-]?token\s*[:=]\s*["'][^"']{8,}/i,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /zoom[a-z0-9_-]*(secret|token)\s*[:=]\s*["'][^"']{8,}/i,
];

const allowedUrlHosts = new Set([
  "appssdk.zoom.us",
  "zoombreakoutautomator.graffuxxx.workers.dev",
]);

const findings = [];

for (const file of filesToScan) {
  const path = join(root, file);
  const content = readFileSync(path, "utf8");

  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: possible secret matched ${pattern}`);
    }
  }

  const urls = content.matchAll(/https?:\/\/[^\s"'<>),;]+/g);
  for (const match of urls) {
    const url = new URL(match[0]);
    if (!allowedUrlHosts.has(url.hostname) && !url.hostname.endsWith(".zoom.us")) {
      findings.push(`${file}: unexpected external URL ${url.href}`);
    }
  }
}

const worker = readFileSync(join(root, "src/worker.js"), "utf8");
const requiredWorkerStrings = [
  "TLSv1.2",
  "TLSv1.3",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Content-Security-Policy",
  "Referrer-Policy",
];

for (const expected of requiredWorkerStrings) {
  if (!worker.includes(expected)) {
    findings.push(`src/worker.js: missing ${expected}`);
  }
}

if (findings.length > 0) {
  console.error("Security check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Security check passed.");
console.log(`Files scanned: ${filesToScan.length}`);
console.log("No hardcoded secrets detected.");
console.log("No unexpected external URLs detected.");
console.log("TLS 1.2+ guard and security headers are present in src/worker.js.");
