import {
  runStructured,
  NegotiationOutput,
  IntentOutput,
  RiskOutput,
  BorrowerContext,
} from "@riverline/shared";

const SYSTEM = `You are the Negotiation agent in a loan-collections system.
Given the borrower profile, intent and risk, propose realistic repayment options
from: partial_payment, restructuring, grace_period, full_settlement.
Pick the single best "recommended" option and draft a short, empathetic message
to the borrower offering it. Do not threaten. Keep it human.
Respond as JSON: { options:[{kind,description}], recommended, draftMessage }.`;

export async function runNegotiationAgent(
  borrower: BorrowerContext,
  intent: IntentOutput,
  risk: RiskOutput,
): Promise<NegotiationOutput> {
  const user = `Borrower: ${JSON.stringify(borrower)}
Intent: ${JSON.stringify(intent)}
Risk: ${JSON.stringify(risk)}`;
  return runStructured(NegotiationOutput, SYSTEM, user);
}
