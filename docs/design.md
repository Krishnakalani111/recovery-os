# recovery-os — design

## What it is

A collections operator chats with a borrower (roleplayed in the UI). Each borrower
message runs a four-agent Temporal workflow that decides the best recovery move.
Everything is persisted so you get a full timeline of decisions and risk changes.

## Agents (each: structured JSON, Gemini)

1. **Intent** — why aren't they paying? `job_loss | salary_delay | medical_emergency | unwilling_to_pay | temporary_cashflow_issue`
2. **Risk** — recovery odds: `low | medium | high` + `recoveryProbability` (0-1)
3. **Negotiation** — repayment `options[]`, a `recommended` one, and a draft message
4. **Compliance** — checks the draft is respectful / non-threatening; approves or rewrites

Agents get the **prior messages in the conversation** as context, so reads are
stateful per thread.

## Recommendation engine (deterministic, not an LLM)

After the agents run, a pure-function engine assembles the committed `recovery_plan`:

- **plan structure** — Negotiation picks the option *kind*; the engine fills concrete
  numbers per kind (grace days, restructured EMI, settlement %, partial amount).
- **confidence** — starts from Risk `recoveryProbability`, nudged by intent confidence
  and compliance flags.
- **followUpDate** — risk band: high → 3d, medium → 7d, low → 14d.
- **escalate** — `unwilling_to_pay` or (high risk & prob < 0.3) → `review`;
  >90 days overdue & unwilling → `legal`; else `no`.
- **risk score** — engine moves `borrowers.riskScore` by band (e.g. high → +8,
  low → −5), clamped 0–100. Agents reason; the engine decides, so it stays auditable.

## Data model

```
borrowers ──< conversations ──< messages ──< agent_runs   (raw per-agent JSON, 4/run)
    │                              └──────── recovery_plan (committed decision, 1/run)
    └──< snapshots (append-only point-in-time rollup, 1/run + 1 baseline at seed)
```

- **borrowers** — current state; `riskScore` mirrors the latest snapshot.
- **conversations** — one collections thread; the spine for timeline + agent memory.
  A new conversation starts a fresh arc; history is never wiped.
- **messages** — chat turns, `role = borrower | agent`.
- **agent_runs** — detailed JSON per agent, for the workflow-graph view.
- **recovery_plans** — the committed plan detail (plan, confidence, followUp, escalate).
- **snapshots** — flattened rollup (risk + intent + decision) for trends/timeline.
  Adding a new signal later is one nullable column here, not a new table.

## Per-message flow

```
borrower message
  → Intent → Risk → Negotiation → Compliance   (Temporal workflow)
  → recovery_plan + snapshot                    (engine)
  → update borrowers.riskScore
  → agent reply message
```

## Stack

pnpm + turbo monorepo. `web` (Next.js), `api`, `workflows` (Temporal worker),
`agents/*`, `db` (Drizzle + Postgres), `shared` (types + Gemini client), `infra` (docker).
