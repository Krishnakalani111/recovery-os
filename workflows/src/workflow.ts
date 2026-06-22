import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  continueAsNew,
  workflowInfo,
  log,
} from "@temporalio/workflow";
import type * as activities from "./activities";

// Two proxies: agent calls hit the LLM (slower, retry a few times); data calls
// are quick. Distinct options make intent explicit and tune retries per kind.
const { classifyIntent, assessRisk, negotiate, checkCompliance } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "1 minute",
  heartbeatTimeout: "30 seconds",
  retry: { maximumAttempts: 3, initialInterval: "2s", backoffCoefficient: 2 },
});

const { loadBorrower, persistTurn } = proxyActivities<typeof activities>({
  startToCloseTimeout: "20 seconds",
  retry: { maximumAttempts: 5 },
});

// ---- signals & queries ----

export interface BorrowerMessage {
  messageId: string;
  text: string;
}

export interface TurnSummary {
  messageId: string;
  intent: string;
  riskBand: string;
  recommended: string;
  reply: string;
}

export interface ConversationState {
  borrowerId: string;
  conversationId: string;
  totalTurns: number;
  processing: boolean;
  turns: TurnSummary[];
}

export const borrowerMessageSignal = defineSignal<[BorrowerMessage]>("borrowerMessage");
export const getStateQuery = defineQuery<ConversationState>("getState");

export interface ConversationParams {
  borrowerId: string;
  conversationId: string;
  carriedTurns?: number; // set when continued-as-new
}

const MAX_TURNS_BEFORE_CONTINUE = 20;

// One durable workflow per conversation. Lives as long as the thread does.
export async function conversationWorkflow(params: ConversationParams): Promise<void> {
  const { borrowerId, conversationId } = params;
  const pending: BorrowerMessage[] = [];

  const state: ConversationState = {
    borrowerId,
    conversationId,
    totalTurns: params.carriedTurns ?? 0,
    processing: false,
    turns: [],
  };

  setHandler(borrowerMessageSignal, (msg) => {
    pending.push(msg);
  });
  setHandler(getStateQuery, () => state);

  while (true) {
    await condition(() => pending.length > 0);

    while (pending.length > 0) {
      const msg = pending.shift()!;
      state.processing = true;
      log.info("processing borrower message", { messageId: msg.messageId });

      const borrower = await loadBorrower(borrowerId);
      const intent = await classifyIntent(borrower, msg.text);
      const risk = await assessRisk(borrower, intent);
      const negotiation = await negotiate(borrower, intent, risk);
      const compliance = await checkCompliance(negotiation);

      await persistTurn({
        borrowerId,
        conversationId,
        messageId: msg.messageId,
        intent,
        risk,
        negotiation,
        compliance,
      });

      state.totalTurns += 1;
      state.turns.push({
        messageId: msg.messageId,
        intent: intent.intent,
        riskBand: risk.riskBand,
        recommended: negotiation.recommended,
        reply: compliance.finalMessage,
      });
      state.processing = false;
    }

    // Bound history: once we've handled enough turns and nothing is queued,
    // continue-as-new with the running count carried forward.
    if (state.totalTurns >= MAX_TURNS_BEFORE_CONTINUE) {
      log.info("continue-as-new to bound history", {
        runId: workflowInfo().runId,
        totalTurns: state.totalTurns,
      });
      await continueAsNew<typeof conversationWorkflow>({
        borrowerId,
        conversationId,
        carriedTurns: state.totalTurns,
      });
    }
  }
}
