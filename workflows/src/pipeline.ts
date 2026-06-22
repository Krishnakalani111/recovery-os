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

export interface AgentResults {
  intent: IntentOutput;
  risk: RiskOutput;
  negotiation: NegotiationOutput;
  compliance: ComplianceOutput;
}

// Run a borrower message through the four agents in order.
// Each agent feeds the next. This is the plain orchestration; the Temporal
// workflow (checkpoint 4) wraps each step as a durable activity.
export async function runAgents(
  borrower: BorrowerContext,
  message: string,
): Promise<AgentResults> {
  const intent = await runIntentAgent(borrower, message);
  const risk = await runRiskAgent(borrower, intent);
  const negotiation = await runNegotiationAgent(borrower, intent, risk);
  const compliance = await runComplianceAgent(negotiation);
  return { intent, risk, negotiation, compliance };
}
