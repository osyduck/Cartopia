import { spawn } from "node:child_process";
import { desc, eq } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { db } from "@/lib/db";
import { backups, databases } from "@/lib/db/schema";
import { s3, BACKUP_BUCKET } from "@/lib/s3";
import { env } from "@/lib/env";

// Verifies a backup is actually restorable: pull the latest successful dump
// for shop_prod from S3 and pg_restore it into a fresh database.
async function main() {
  const target = process.argv[2] ?? "shop_prod";
  const restoreDb = "restore_test";
  const container = env.BACKUP_DOCKER_CONTAINER || "cartopia-dataplane-pg";

  const [b] = await db
    .select({ location: backups.location })
    .from(backups)
    .innerJoin(databases, eq(backups.databaseId, databases.id))
    .where(eq(databases.name, target))
    .orderBy(desc(backups.createdAt))
    .limit(1);
  if (!b?.location) throw new Error(`no backup found for ${target}`);
  console.log(`restoring ${b.location} -> db "${restoreDb}"`);

  // Fresh target database.
  await exec(`docker exec ${container} dropdb -U postgres --if-exists ${restoreDb}`);
  await exec(`docker exec ${container} createdb -U postgres ${restoreDb}`);

  // Stream the S3 object into pg_restore's stdin.
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: BACKUP_BUCKET, Key: b.location }),
  );
  const body = obj.Body as Readable;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      `docker exec -i ${container} pg_restore -U postgres -d ${restoreDb} --no-owner`,
      { shell: true },
    );
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr || `pg_restore exit ${code}`)),
    );
    body.pipe(child.stdin);
  });

  // Verify: list tables in the restored database.
  const tables = await exec(
    `docker exec ${container} psql -U postgres -d ${restoreDb} -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"`,
  );
  console.log(`restored OK — public tables: ${tables.trim()}`);

  await exec(`docker exec ${container} dropdb -U postgres --if-exists ${restoreDb}`);
}

function exec(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c.toString()));
    child.stderr.on("data", (c) => (err += c.toString()));
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(err || `exit ${code}`)),
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("restore test failed:", e);
    process.exit(1);
  });
