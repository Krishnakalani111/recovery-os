import {
  runStructured,
  RiskOutput,
  IntentOutput,
  BorrowerContext,
} from "@riverline/shared";

const SYSTEM = `You are the Risk agent in a loan-collections system.
Given the borrower profile and the classified intent, estimate how likely we are
to recover the money. Weigh days overdue, missed EMIs, risk score and intent
(e.g. job_loss and unwilling_to_pay are riskier than salary_delay).
Respond as JSON: { riskBand (low|medium|high), recoveryProbability (0-1), reason }.`;

export async function runRiskAgent(
  borrower: BorrowerContext,
  intent: IntentOutput,
): Promise<RiskOutput> {
  const user = `Borrower: ${JSON.stringify(borrower)}\nIntent: ${JSON.stringify(intent)}`;
  return runStructured(RiskOutput, SYSTEM, user);
}
