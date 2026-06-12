import { runAllBackups, pruneOldBackups } from "@/lib/services/backups";
import { formatBytes } from "@/lib/format";

// One-off backup of every database + retention prune. For testing/manual runs.
async function main() {
  const res = await runAllBackups();
  console.table(
    res.map((r) => ({
      database: r.name,
      status: r.status,
      size: r.sizeBytes != null ? formatBytes(r.sizeBytes) : "—",
      error: r.error ?? "",
    })),
  );
  const pruned = await pruneOldBackups();
  console.log(`pruned ${pruned} backups older than retention`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
