import type {
  Intent,
  RiskBand,
  Escalation,
  OptionKind,
  BorrowerContext,
  IntentOutput,
  RiskOutput,
  NegotiationOutput,
  ComplianceOutput,
} from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

// How soon collections should follow up, by risk band.
export function followUpDays(band: RiskBand): number {
  return band === "high" ? 3 : band === "medium" ? 7 : 14;
}

// Move the borrower's live risk score after a turn (clamped 0..100).
export function nextRiskScore(before: number, band: RiskBand): number {
  const delta = band === "high" ? 8 : band === "low" ? -5 : 0;
  return clamp(before + delta, 0, 100);
}

export interface EscalationInput {
  intent: Intent;
  riskBand: RiskBand;
  recoveryProbability: number;
  daysOverdue: number;
}

// Decide whether a human / legal needs to step in.
export function computeEscalation(i: EscalationInput): Escalation {
  if (i.intent === "unwilling_to_pay" && i.daysOverdue > 90) return "legal";
  if (i.intent === "unwilling_to_pay") return "review";
  if (i.riskBand === "high" && i.recoveryProbability < 0.3) return "review";
  return "no";
}

// Confidence the plan will succeed: recovery odds scaled by how sure we are
// about the intent, penalised if compliance had to intervene.
export function computeConfidence(
  recoveryProbability: number,
  intentConfidence: number,
  complianceApproved: boolean,
): number {
  let c = recoveryProbability * intentConfidence;
  if (!complianceApproved) c -= 0.1;
  return round2(clamp(c, 0, 1));
}

// Turn the chosen option kind into concrete, borrower-specific terms.
export function buildPlanStructure(kind: OptionKind, b: BorrowerContext) {
  switch (kind) {
    case "partial_payment":
      return { kind, payNow: Math.round(b.emiAmount * 0.5) };
    case "restructuring":
      return { kind, newEmi: Math.round(b.emiAmount * 0.7), tenureExtensionMonths: 6 };
    case "grace_period":
      return { kind, graceDays: 30, resumeEmi: b.emiAmount };
    case "full_settlement":
      return { kind, settlementAmount: Math.round(b.loanAmount * 0.85) };
  }
}

export interface RecommendationInput {
  borrower: BorrowerContext;
  intent: IntentOutput;
  risk: RiskOutput;
  negotiation: NegotiationOutput;
  compliance: ComplianceOutput;
}

export interface RecoveryRecommendation {
  plan: ReturnType<typeof buildPlanStructure>;
  confidence: number;
  followUpInDays: number;
  escalate: Escalation;
  newRiskScore: number;
}

// The deterministic decision layer: agents reason, this commits the plan.
export function buildRecommendation(i: RecommendationInput): RecoveryRecommendation {
  return {
    plan: buildPlanStructure(i.negotiation.recommended, i.borrower),
    confidence: computeConfidence(
      i.risk.recoveryProbability,
      i.intent.confidence,
      i.compliance.approved,
    ),
    followUpInDays: followUpDays(i.risk.riskBand),
    escalate: computeEscalation({
      intent: i.intent.intent,
      riskBand: i.risk.riskBand,
      recoveryProbability: i.risk.recoveryProbability,
      daysOverdue: i.borrower.daysOverdue,
    }),
    newRiskScore: nextRiskScore(i.borrower.riskScore, i.risk.riskBand),
  };
}
