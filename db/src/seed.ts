import { db } from "./client";
import { borrowers } from "./schema";

// A few borrowers spanning the risk spectrum.
const seed = [
  { name: "Ravi Sharma", loanAmount: "450000", emiAmount: "12500", daysOverdue: 18, missedEmis: 1, riskScore: 35 },
  { name: "Anita Desai", loanAmount: "800000", emiAmount: "21000", daysOverdue: 62, missedEmis: 3, riskScore: 72 },
  { name: "Mohammed Irfan", loanAmount: "250000", emiAmount: "8000", daysOverdue: 5, missedEmis: 1, riskScore: 20 },
  { name: "Priya Nair", loanAmount: "1200000", emiAmount: "34000", daysOverdue: 95, missedEmis: 4, riskScore: 88 },
];

async function main() {
  await db.insert(borrowers).values(seed);
  console.log(`seeded ${seed.length} borrowers`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
