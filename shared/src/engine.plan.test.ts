import { describe, it, expect } from "vitest";
import { buildPlanStructure, buildRecommendation } from "./engine";
import type { BorrowerContext } from "./types";

const borrower: BorrowerContext = {
  name: "Anita Desai",
  loanAmount: 800000,
  emiAmount: 20000,
  daysOverdue: 62,
  missedEmis: 3,
  riskScore: 72,
};

describe("buildPlanStructure", () => {
  it("partial payment asks for half an EMI now", () => {
    expect(buildPlanStructure("partial_payment", borrower)).toEqual({
      kind: "partial_payment",
      payNow: 10000,
    });
  });

  it("restructuring lowers the EMI and extends tenure", () => {
    expect(buildPlanStructure("restructuring", borrower)).toEqual({
      kind: "restructuring",
      newEmi: 14000,
      tenureExtensionMonths: 6,
    });
  });

  it("grace period defers without changing the EMI", () => {
    expect(buildPlanStructure("grace_period", borrower)).toEqual({
      kind: "grace_period",
      graceDays: 30,
      resumeEmi: 20000,
    });
  });

  it("full settlement discounts the outstanding", () => {
    expect(buildPlanStructure("full_settlement", borrower)).toEqual({
      kind: "full_settlement",
      settlementAmount: 680000,
    });
  });
});

describe("buildRecommendation", () => {
  it("assembles the committed plan from agent outputs", () => {
    const rec = buildRecommendation({
      borrower,
      intent: { intent: "job_loss", confidence: 0.9, reason: "" },
      risk: { riskBand: "high", recoveryProbability: 0.25, reason: "" },
      negotiation: {
        options: [{ kind: "restructuring", description: "" }],
        recommended: "restructuring",
        draftMessage: "",
      },
      compliance: { approved: true, finalMessage: "ok", flags: [] },
    });

    expect(rec.plan).toEqual({ kind: "restructuring", newEmi: 14000, tenureExtensionMonths: 6 });
    expect(rec.confidence).toBe(0.23); // 0.25 * 0.9
    expect(rec.followUpInDays).toBe(3); // high
    expect(rec.escalate).toBe("review"); // high & prob < 0.3
    expect(rec.newRiskScore).toBe(80); // 72 + 8
  });
});
