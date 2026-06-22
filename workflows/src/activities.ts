import { Context, ApplicationFailure } from "@temporalio/activity";
import { eq } from "drizzle-orm";
import { db, schema } from "@riverline/db";
import type {
  BorrowerContext,
  IntentOutput,
  RiskOutput,
  NegotiationOutput,
  ComplianceOutput,
} from "@riverline/shared";
import { runIntentAgent } from "@riverline/intent-agent";
import { runRiskAgent } from "@riverline/risk-agent";
import { runNegotiationAgent } from "@riverline/negotiation-agent";
import { runComplianceAgent } from "@riverline/compliance-agent";

// ---- data activities ----

export async function loadBorrower(borrowerId: string): Promise<BorrowerContext> {
  const [b] = await db
    .select()
    .from(schema.borrowers)
    .where(eq(schema.borrowers.id, borrowerId));

  // Missing borrower is a permanent error — don't let Temporal retry it.
  if (!b) {
    throw ApplicationFailure.nonRetryable(`borrower ${borrowerId} not found`, "NotFound");
  }

  return {
    name: b.name,
    loanAmount: Number(b.loanAmount),
    emiAmount: Number(b.emiAmount),
    daysOverdue: b.daysOverdue,
    missedEmis: b.missedEmis,
    riskScore: b.riskScore,
  };
}

// ---- agent activities (one each, so each retries and shows up separately) ----

export async function classifyIntent(
  borrower: BorrowerContext,
  message: string,
): Promise<IntentOutput> {
  Context.current().heartbeat("intent");
  return runIntentAgent(borrower, message);
}

export async function assessRisk(
  borrower: BorrowerContext,
  intent: IntentOutput,
): Promise<RiskOutput> {
  Context.current().heartbeat("risk");
  return runRiskAgent(borrower, intent);
}

export async function negotiate(
  borrower: BorrowerContext,
  intent: IntentOutput,
  risk: RiskOutput,
): Promise<NegotiationOutput> {
  Context.current().heartbeat("negotiation");
  return runNegotiationAgent(borrower, intent, risk);
}

export async function checkCompliance(
  negotiation: NegotiationOutput,
): Promise<ComplianceOutput> {
  Context.current().heartbeat("compliance");
  return runComplianceAgent(negotiation);
}

// ---- persistence activity ----

export interface PersistTurnInput {
  borrowerId: string;
  conversationId: string;
  messageId: string; // the borrower message that triggered this turn
  intent: IntentOutput;
  risk: RiskOutput;
  negotiation: NegotiationOutput;
  compliance: ComplianceOutput;
}

// Writes the agent reply, the four raw agent runs, a snapshot, and moves the
// borrower's live risk score. A fuller recommendation engine lands in the next
// checkpoint; here we persist the agents' work and a band-based risk delta.
export async function persistTurn(input: PersistTurnInput): Promise<void> {
  const { borrowerId, conversationId, messageId } = input;

  await db.insert(schema.messages).values({
    conversationId,
    role: "agent",
    content: input.compliance.finalMessage,
  });

  await db.insert(schema.agentRuns).values([
    { messageId, agent: "intent", output: input.intent },
    { messageId, agent: "risk", output: input.risk },
    { messageId, agent: "negotiation", output: input.negotiation },
    { messageId, agent: "compliance", output: input.compliance },
  ]);

  const [b] = await db
    .select({ score: schema.borrowers.riskScore })
    .from(schema.borrowers)
    .where(eq(schema.borrowers.id, borrowerId));
  const before = b?.score ?? 50;
  const delta = input.risk.riskBand === "high" ? 8 : input.risk.riskBand === "low" ? -5 : 0;
  const after = Math.max(0, Math.min(100, before + delta));

  await db.insert(schema.snapshots).values({
    borrowerId,
    conversationId,
    messageId,
    riskScore: after,
    riskBand: input.risk.riskBand,
    recoveryProbability: String(input.risk.recoveryProbability),
    intent: input.intent.intent,
    intentConfidence: String(input.intent.confidence),
    recommendedOption: input.negotiation.recommended,
    escalate: "no",
  });

  await db
    .update(schema.borrowers)
    .set({ riskScore: after })
    .where(eq(schema.borrowers.id, borrowerId));
}
