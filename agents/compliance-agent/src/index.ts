import {
  runStructured,
  ComplianceOutput,
  NegotiationOutput,
} from "@riverline/shared";

const SYSTEM = `You are the Compliance agent in a loan-collections system.
Review the drafted borrower message. It must be respectful, non-threatening,
free of harassment, and must not promise anything illegal. If it is safe, approve
it (you may lightly polish wording). If not, rewrite it to be compliant.
List any issues you found in "flags".
Respond as JSON: { approved (bool), finalMessage, flags:[string] }.`;

export async function runComplianceAgent(
  negotiation: NegotiationOutput,
): Promise<ComplianceOutput> {
  const user = `Draft message: "${negotiation.draftMessage}"
Recommended option: ${negotiation.recommended}`;
  return runStructured(ComplianceOutput, SYSTEM, user);
}
