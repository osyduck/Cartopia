import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { env } from "@/lib/env";
import { runQuotaSweep } from "@/lib/services/quota";

const QUEUE = "cartopia-jobs";

// Pass options (not an ioredis instance) so BullMQ uses its bundled ioredis.
function redisConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

async function main() {
  const connection = redisConnection();

  const queue = new Queue(QUEUE, { connection });

  // Repeatable quota sweep on a fixed interval (BullMQ job scheduler).
  await queue.upsertJobScheduler(
    "quota-sweep",
    { every: env.QUOTA_SWEEP_INTERVAL_SECONDS * 1000 },
    { name: "quota-sweep" },
  );
  // Run once right away so we don't wait a full interval on boot.
  await queue.add("quota-sweep", {});

  const worker = new Worker(
    QUEUE,
    async (job) => {
      if (job.name === "quota-sweep") {
        const res = await runQuotaSweep();
        const acted = res.databases.filter((d) => d.action !== "none");
        console.log(
          `[worker] quota-sweep: ${res.databases.length} scanned, ${acted.length} acted` +
            (acted.length
              ? ` (${acted.map((d) => `${d.name}:${d.action}`).join(", ")})`
              : ""),
        );
        return res;
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) =>
    console.error(`[worker] job ${job?.name} failed:`, err.message),
  );

  console.log(
    `[worker] up — quota sweep every ${env.QUOTA_SWEEP_INTERVAL_SECONDS}s`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
