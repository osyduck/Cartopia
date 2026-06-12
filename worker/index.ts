import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { env } from "@/lib/env";
import { runQuotaSweep } from "@/lib/services/quota";
import { runMonitorSweep } from "@/lib/services/monitoring";
import { runAllBackups, pruneOldBackups } from "@/lib/services/backups";

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

  // Repeatable schedulers (BullMQ job scheduler).
  await queue.upsertJobScheduler(
    "quota-sweep",
    { every: env.QUOTA_SWEEP_INTERVAL_SECONDS * 1000 },
    { name: "quota-sweep" },
  );
  await queue.upsertJobScheduler(
    "monitor-sweep",
    { every: env.METRICS_SWEEP_INTERVAL_SECONDS * 1000 },
    { name: "monitor-sweep" },
  );
  await queue.upsertJobScheduler(
    "backup-all",
    { pattern: env.BACKUP_CRON },
    { name: "backup-all" },
  );
  // Run the sweeps once on boot so we don't wait a full interval.
  await queue.add("quota-sweep", {});
  await queue.add("monitor-sweep", {});

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
      if (job.name === "monitor-sweep") {
        const res = await runMonitorSweep();
        console.log(
          `[worker] monitor-sweep: ${res.instancesChecked} instances, ${res.databasesSampled} sampled`,
        );
        return res;
      }
      if (job.name === "backup-all") {
        const res = await runAllBackups();
        const pruned = await pruneOldBackups();
        const ok = res.filter((r) => r.status === "success").length;
        console.log(
          `[worker] backup-all: ${ok}/${res.length} ok, ${pruned} pruned (>${env.BACKUP_RETENTION_DAYS}d)`,
        );
        return { res, pruned };
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) =>
    console.error(`[worker] job ${job?.name} failed:`, err.message),
  );

  console.log(
    `[worker] up — quota ${env.QUOTA_SWEEP_INTERVAL_SECONDS}s · monitor ${env.METRICS_SWEEP_INTERVAL_SECONDS}s · backup "${env.BACKUP_CRON}"`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
