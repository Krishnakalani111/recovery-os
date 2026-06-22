import { Client, Connection } from "@temporalio/client";
import {
  conversationWorkflow,
  borrowerMessageSignal,
  getStateQuery,
  type ConversationState,
} from "./workflow";

const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? "recovery";

let client: Client | undefined;

export async function getClient(): Promise<Client> {
  if (client) return client;
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });
  client = new Client({ connection, namespace: process.env.TEMPORAL_NAMESPACE ?? "default" });
  return client;
}

const workflowId = (conversationId: string) => `conversation-${conversationId}`;

// Start the conversation workflow if it isn't running, then deliver the message.
// One idempotent call — exactly what signalWithStart is for.
export async function sendBorrowerMessage(args: {
  borrowerId: string;
  conversationId: string;
  messageId: string;
  text: string;
}): Promise<void> {
  const c = await getClient();
  await c.workflow.signalWithStart(conversationWorkflow, {
    workflowId: workflowId(args.conversationId),
    taskQueue,
    args: [{ borrowerId: args.borrowerId, conversationId: args.conversationId }],
    signal: borrowerMessageSignal,
    signalArgs: [{ messageId: args.messageId, text: args.text }],
  });
}

// Read live workflow state via query (no DB hit).
export async function queryConversationState(
  conversationId: string,
): Promise<ConversationState> {
  const c = await getClient();
  const handle = c.workflow.getHandle(workflowId(conversationId));
  return handle.query(getStateQuery);
}
