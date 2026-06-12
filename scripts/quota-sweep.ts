import { runQuotaSweep } from "@/lib/services/quota";
import { formatBytes } from "@/lib/format";

// One-off quota sweep (no Redis/worker needed). Handy for testing enforcement.
async function main() {
  const res = await runQuotaSweep();
  console.table(
    res.databases.map((d) => ({
      database: d.name,
      size: formatBytes(d.sizeBytes),
      quota: d.quotaBytes ? formatBytes(d.quotaBytes) : "∞",
      action: d.action,
    })),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
