import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../..", ".env") });

const { db, schema } = await import("@riverline/db");
const { sendBorrowerMessage, queryConversationState } = await import("./client");

const text = process.argv[2] ?? "I lost my job last month.";

async function main() {
  // Use the first seeded borrower and open a fresh conversation.
  const [borrower] = await db.select().from(schema.borrowers).limit(1);
  if (!borrower) throw new Error("no borrowers — run db:seed first");

  const [conversation] = await db
    .insert(schema.conversations)
    .values({ borrowerId: borrower.id })
    .returning();

  const [message] = await db
    .insert(schema.messages)
    .values({ conversationId: conversation.id, role: "borrower", content: text })
    .returning();

  console.log(`borrower: ${borrower.name}\nmessage:  "${text}"\n`);

  await sendBorrowerMessage({
    borrowerId: borrower.id,
    conversationId: conversation.id,
    messageId: message.id,
    text,
  });

  // Poll the workflow query until the turn lands.
  for (let i = 0; i < 30; i++) {
    const state = await queryConversationState(conversation.id);
    if (state.turns.length > 0 && !state.processing) {
      console.log("workflow state:", JSON.stringify(state, null, 2));
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("timed out waiting for the workflow to process the turn");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
