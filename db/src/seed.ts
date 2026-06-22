import { db } from "./client";
import { borrowers, snapshots } from "./schema";

// A few borrowers spanning the risk spectrum.
const seed = [
  { name: "Ravi Sharma", loanAmount: "450000", emiAmount: "12500", daysOverdue: 18, missedEmis: 1, riskScore: 35 },
  { name: "Anita Desai", loanAmount: "800000", emiAmount: "21000", daysOverdue: 62, missedEmis: 3, riskScore: 72 },
  { name: "Mohammed Irfan", loanAmount: "250000", emiAmount: "8000", daysOverdue: 5, missedEmis: 1, riskScore: 20 },
  { name: "Priya Nair", loanAmount: "1200000", emiAmount: "34000", daysOverdue: 95, missedEmis: 4, riskScore: 88 },
];

async function main() {
  const inserted = await db.insert(borrowers).values(seed).returning();

  // Baseline snapshot per borrower so every trend has a starting point.
  await db.insert(snapshots).values(
    inserted.map((b) => ({ borrowerId: b.id, riskScore: b.riskScore })),
  );

  console.log(`seeded ${inserted.length} borrowers + baseline snapshots`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
