import { describe, it, expect } from "vitest";
import { followUpDays, nextRiskScore, computeEscalation, computeConfidence } from "./engine";

describe("followUpDays", () => {
  it("chases high risk soonest", () => {
    expect(followUpDays("high")).toBe(3);
    expect(followUpDays("medium")).toBe(7);
    expect(followUpDays("low")).toBe(14);
  });
});

describe("nextRiskScore", () => {
  it("raises on high, lowers on low, holds on medium", () => {
    expect(nextRiskScore(50, "high")).toBe(58);
    expect(nextRiskScore(50, "low")).toBe(45);
    expect(nextRiskScore(50, "medium")).toBe(50);
  });

  it("clamps to 0..100", () => {
    expect(nextRiskScore(96, "high")).toBe(100);
    expect(nextRiskScore(3, "low")).toBe(0);
  });
});

describe("computeEscalation", () => {
  it("returns no for a cooperative low-risk case", () => {
    expect(
      computeEscalation({ intent: "salary_delay", riskBand: "low", recoveryProbability: 0.8, daysOverdue: 10 }),
    ).toBe("no");
  });

  it("flags review when unwilling to pay", () => {
    expect(
      computeEscalation({ intent: "unwilling_to_pay", riskBand: "medium", recoveryProbability: 0.5, daysOverdue: 20 }),
    ).toBe("review");
  });

  it("flags review on high risk with low recovery odds", () => {
    expect(
      computeEscalation({ intent: "job_loss", riskBand: "high", recoveryProbability: 0.2, daysOverdue: 40 }),
    ).toBe("review");
  });

  it("escalates to legal when unwilling and badly overdue", () => {
    expect(
      computeEscalation({ intent: "unwilling_to_pay", riskBand: "high", recoveryProbability: 0.2, daysOverdue: 95 }),
    ).toBe("legal");
  });
});

describe("computeConfidence", () => {
  it("starts from recovery probability scaled by intent confidence", () => {
    expect(computeConfidence(0.8, 0.5, true)).toBe(0.4);
  });

  it("penalises when compliance did not approve cleanly", () => {
    expect(computeConfidence(0.8, 1, false)).toBe(0.7);
  });

  it("clamps to 0..1", () => {
    expect(computeConfidence(1, 1, true)).toBe(1);
    expect(computeConfidence(0.05, 0.1, false)).toBe(0);
  });
});
