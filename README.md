# recovery-os

An AI borrower recovery operating system. A collections agent can chat with a
borrower (roleplayed in the UI), and a multi-agent workflow figures out the best
recovery strategy in real time.

Each borrower message runs through four agents:

1. **Intent** – why is the borrower not paying? (job loss, salary delay, medical, etc.)
2. **Risk** – how likely are we to recover? (low / medium / high)
3. **Negotiation** – what repayment options make sense? (partial, restructure, grace, settlement)
4. **Compliance** – is the final response respectful, non-threatening and safe to send?

The four agents are chained as a Temporal workflow so every run is durable,
inspectable and replayable. Outputs are structured JSON and stored alongside the
conversation, so you get a full timeline of decisions and risk changes.

## Stack

- **Next.js** – dashboard, chat, agent graph, timeline (UI + API routes)
- **Temporal** – orchestrates the four agents as a durable workflow
- **Drizzle + Postgres** – borrowers, conversations, messages, agent runs, plans
- **Gemini** – the model behind each agent (free tier, structured output)

## Running locally

```bash
cp .env.example .env        # add your GEMINI_API_KEY
npm install
npm run infra:up            # Postgres + Temporal dev server (Docker)
npm run db:migrate          # apply schema
npm run db:seed             # a few sample borrowers
npm run worker              # Temporal worker (separate terminal)
npm run dev                 # app on http://localhost:3000
```

Temporal UI: http://localhost:8233

## Layout

```
src/
  agents/      the four agents, each with a JSON schema
  workflows/   the Temporal recovery workflow
  activities/  agent calls wrapped as Temporal activities
  db/          drizzle schema, client, seed
  services/    LLM client, recovery recommendation logic
  worker.ts    Temporal worker entrypoint
app/           Next.js routes and UI
```

## Status

Early. Built in checkpoints — see commit history.
