import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../..", ".env") });

async function main() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "recovery",
    workflowsPath: resolve(here, "workflow.ts"),
    activities,
  });

  console.log("worker started on task queue:", process.env.TEMPORAL_TASK_QUEUE ?? "recovery");
  await worker.run();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
