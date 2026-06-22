import { runStructured, IntentOutput, BorrowerContext } from "@riverline/shared";

const SYSTEM = `You are the Intent agent in a loan-collections system.
Classify why the borrower is not paying, based on their message and profile.
Pick exactly one intent from: job_loss, salary_delay, medical_emergency,
unwilling_to_pay, temporary_cashflow_issue.
Respond as JSON: { intent, confidence (0-1), reason }.`;

export async function runIntentAgent(
  borrower: BorrowerContext,
  message: string,
): Promise<IntentOutput> {
  const user = `Borrower: ${JSON.stringify(borrower)}\nMessage: "${message}"`;
  return runStructured(IntentOutput, SYSTEM, user);
}
