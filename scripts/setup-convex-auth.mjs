// Generates the JWT signing keys Convex Auth needs and stores them, plus
// SITE_URL, on the active Convex deployment. Safe to re-run; it only
// overwrites keys when --rotate is passed.
import { execFileSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const rotate = process.argv.includes("--rotate");
const siteUrl = process.env.SITE_URL || "http://localhost:3000";
const prodFlag = process.argv.includes("--prod") ? ["--prod"] : [];

function convexEnv(args) {
  return execFileSync("npx", ["convex", "env", ...args, ...prodFlag], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

const existing = convexEnv(["list"]);
const hasKeys = /^JWT_PRIVATE_KEY=/m.test(existing) && /^JWKS=/m.test(existing);

if (!hasKeys || rotate) {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  convexEnv(["set", `JWT_PRIVATE_KEY=${privateKey.trimEnd().replace(/\n/g, " ")}`]);
  convexEnv(["set", `JWKS=${jwks}`]);
  console.log(hasKeys ? "Rotated JWT_PRIVATE_KEY and JWKS." : "Created JWT_PRIVATE_KEY and JWKS.");
} else {
  console.log("JWT keys already present; keeping them (pass --rotate to replace).");
}

if (!/^SITE_URL=/m.test(existing) || rotate) {
  convexEnv(["set", `SITE_URL=${siteUrl}`]);
  console.log(`SITE_URL set to ${siteUrl}`);
}
console.log("Done. Set DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_WEBHOOK_KEY, DODO_PRODUCT_ID, and DODO_ENVIRONMENT with `npx convex env set`.");
