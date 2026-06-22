import { z } from "zod";

// ---- Agent enums ----
export const Intent = z.enum([
  "job_loss",
  "salary_delay",
  "medical_emergency",
  "unwilling_to_pay",
  "temporary_cashflow_issue",
]);
export type Intent = z.infer<typeof Intent>;

export const RiskBand = z.enum(["low", "medium", "high"]);
export type RiskBand = z.infer<typeof RiskBand>;

export const OptionKind = z.enum([
  "partial_payment",
  "restructuring",
  "grace_period",
  "full_settlement",
]);
export type OptionKind = z.infer<typeof OptionKind>;

export const Escalation = z.enum(["no", "review", "legal"]);
export type Escalation = z.infer<typeof Escalation>;

// ---- Per-agent output schemas ----
export const IntentOutput = z.object({
  intent: Intent,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});
export type IntentOutput = z.infer<typeof IntentOutput>;

export const RiskOutput = z.object({
  riskBand: RiskBand,
  recoveryProbability: z.number().min(0).max(1),
  reason: z.string(),
});
export type RiskOutput = z.infer<typeof RiskOutput>;

export const RepaymentOption = z.object({
  kind: OptionKind,
  description: z.string(),
});
export const NegotiationOutput = z.object({
  options: z.array(RepaymentOption).min(1),
  recommended: OptionKind,
  draftMessage: z.string(),
});
export type NegotiationOutput = z.infer<typeof NegotiationOutput>;

export const ComplianceOutput = z.object({
  approved: z.boolean(),
  finalMessage: z.string(),
  flags: z.array(z.string()),
});
export type ComplianceOutput = z.infer<typeof ComplianceOutput>;

// ---- Borrower context passed to every agent ----
export const BorrowerContext = z.object({
  name: z.string(),
  loanAmount: z.number(),
  emiAmount: z.number(),
  daysOverdue: z.number(),
  missedEmis: z.number(),
  riskScore: z.number(),
});
export type BorrowerContext = z.infer<typeof BorrowerContext>;
