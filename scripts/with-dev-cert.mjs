// CLI for dev-cert.mjs: runs a command with the .NET dev certificate trusted.
//
//   node scripts/with-dev-cert.mjs next dev
//   node scripts/with-dev-cert.mjs playwright test --grep "Screen-out"
//   node scripts/with-dev-cert.mjs --export   (pnpm setup:dev: export the PEM once)

import {
  devCertPath,
  exportDevCertificate,
  fail,
  runWithDevCert,
} from "./dev-cert.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  fail("Usage: node scripts/with-dev-cert.mjs <command> [args...] | --export");
}
if (command === "--export") {
  exportDevCertificate(devCertPath());
} else {
  runWithDevCert(command, args);
}
