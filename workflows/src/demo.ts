import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runAgents } from "./pipeline";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../..", ".env") });

// One sample borrower; message comes from argv.
const borrower = {
  name: "Anita Desai",
  loanAmount: 800000,
  emiAmount: 21000,
  daysOverdue: 62,
  missedEmis: 3,
  riskScore: 72,
};

const message = process.argv[2] ?? "I lost my job last month.";

async function main() {
  console.log(`\nBorrower: ${borrower.name}\nMessage: "${message}"\n`);
  const r = await runAgents(borrower, message);
  for (const [name, out] of Object.entries(r)) {
    console.log(`── ${name} ──`);
    console.log(JSON.stringify(out, null, 2), "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
