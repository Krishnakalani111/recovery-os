import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// A borrower with an overdue loan.
export const borrowers = pgTable("borrowers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  loanAmount: numeric("loan_amount").notNull(),
  emiAmount: numeric("emi_amount").notNull(),
  daysOverdue: integer("days_overdue").notNull().default(0),
  missedEmis: integer("missed_emis").notNull().default(0),
  riskScore: integer("risk_score").notNull().default(50), // 0-100
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One collections conversation with a borrower.
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  borrowerId: uuid("borrower_id")
    .notNull()
    .references(() => borrowers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat messages. role = borrower (roleplayed) or agent (final response).
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "borrower" | "agent"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One agent's structured output within a workflow run.
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(), // intent | risk | negotiation | compliance
  output: jsonb("output").notNull(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// The recommendation produced at the end of a workflow run.
export const recoveryPlans = pgTable("recovery_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  plan: jsonb("plan").notNull(),
  confidence: numeric("confidence").notNull(), // 0-1
  followUpDate: timestamp("follow_up_date"),
  escalate: text("escalate").notNull().default("no"), // no | review | legal
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
