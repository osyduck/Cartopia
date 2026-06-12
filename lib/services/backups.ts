import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { and, desc, eq, lt } from "drizzle-orm";
import { Upload } from "@aws-sdk/lib-storage";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import {
  backups,
  databases,
  instances,
  type Instance,
} from "@/lib/db/schema";
import { s3, BACKUP_BUCKET } from "@/lib/s3";
import { decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

/**
 * Spawn pg_dump (custom format) for a database. In dev we exec inside the
 * data-plane container (matching version, local trust auth — no password);
 * in prod we shell out to a native pg_dump using the instance credentials.
 */
function spawnPgDump(instance: Instance, dbName: string) {
  // A single shell command string (no args array) so "docker"/"pg_dump" resolve
  // via PATH on Windows too, without the DEP0190 args-with-shell warning. Every
  // component is trusted: env-configured container/binary, instance admin config,
  // and a validated identifier dbName.
  if (env.BACKUP_DOCKER_CONTAINER) {
    const cmd = `docker exec ${env.BACKUP_DOCKER_CONTAINER} pg_dump -U ${instance.adminUser} -Fc ${dbName}`;
    return spawn(cmd, { shell: true });
  }
  const cmd = `${env.PG_DUMP_BIN} -h ${instance.host} -p ${instance.port} -U ${instance.adminUser} -Fc -d ${dbName}`;
  return spawn(cmd, {
    shell: true,
    env: { ...process.env, PGPASSWORD: decryptSecret(instance.adminPasswordEnc) },
  });
}

function timestampKey(dbName: string): string {
  // Date is fine in normal Node code (this is not a Workflow script).
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `${dbName}/${iso}.dump`;
}

export type BackupOutcome = {
  databaseId: string;
  name: string;
  status: "success" | "failed";
  sizeBytes?: number;
  error?: string;
};

export async function runBackup(databaseId: string): Promise<BackupOutcome> {
  const [row] = await db
    .select({ database: databases, instance: instances })
    .from(databases)
    .innerJoin(instances, eq(databases.instanceId, instances.id))
    .where(eq(databases.id, databaseId))
    .limit(1);
  if (!row) throw new Error("Database not found.");
  const { database: d, instance } = row;

  const key = timestampKey(d.name);
  const [backup] = await db
    .insert(backups)
    .values({
      databaseId: d.id,
      location: key,
      status: "running",
      startedAt: new Date(),
    })
    .returning({ id: backups.id });

  try {
    const child = spawnPgDump(instance, d.name);
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });

    // Count bytes as they stream to S3.
    let bytes = 0;
    const counter = new PassThrough();
    counter.on("data", (c: Buffer) => {
      bytes += c.length;
    });
    child.stdout.pipe(counter);

    const exit = new Promise<number>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 0));
    });

    const upload = new Upload({
      client: s3,
      params: { Bucket: BACKUP_BUCKET, Key: key, Body: counter },
    });

    const [, code] = await Promise.all([upload.done(), exit]);

    if (code !== 0) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: BACKUP_BUCKET, Key: key }))
        .catch(() => {});
      throw new Error(stderr.trim() || `pg_dump exited with code ${code}`);
    }

    await db
      .update(backups)
      .set({ status: "success", sizeBytes: bytes, finishedAt: new Date() })
      .where(eq(backups.id, backup.id));

    await writeAudit({
      actor: "system",
      action: "backup.create",
      target: d.name,
      metadata: { key, sizeBytes: bytes },
    });

    return { databaseId: d.id, name: d.name, status: "success", sizeBytes: bytes };
  } catch (err) {
    const message = (err as Error).message;
    await db
      .update(backups)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(backups.id, backup.id));
    return { databaseId: d.id, name: d.name, status: "failed", error: message };
  }
}

export async function runAllBackups(): Promise<BackupOutcome[]> {
  const rows = await db.select({ id: databases.id }).from(databases);
  const out: BackupOutcome[] = [];
  for (const r of rows) {
    out.push(await runBackup(r.id));
  }
  return out;
}

/** Delete backup objects + rows older than the retention window. */
export async function pruneOldBackups(): Promise<number> {
  const cutoff = new Date(
    Date.now() - env.BACKUP_RETENTION_DAYS * 86_400 * 1000,
  );
  const stale = await db
    .select({ id: backups.id, location: backups.location })
    .from(backups)
    .where(lt(backups.createdAt, cutoff));

  for (const b of stale) {
    if (b.location) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: BACKUP_BUCKET, Key: b.location }))
        .catch(() => {});
    }
  }
  if (stale.length) {
    await db.delete(backups).where(lt(backups.createdAt, cutoff));
  }
  return stale.length;
}

export type BackupListItem = {
  id: string;
  dbName: string;
  status: (typeof backups.status.enumValues)[number];
  sizeBytes: number | null;
  location: string | null;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
};

export async function listBackups(limit = 100): Promise<BackupListItem[]> {
  return db
    .select({
      id: backups.id,
      dbName: databases.name,
      status: backups.status,
      sizeBytes: backups.sizeBytes,
      location: backups.location,
      error: backups.error,
      createdAt: backups.createdAt,
      finishedAt: backups.finishedAt,
    })
    .from(backups)
    .innerJoin(databases, eq(backups.databaseId, databases.id))
    .orderBy(desc(backups.createdAt))
    .limit(limit);
}

export async function getBackupStats(): Promise<{
  total: number;
  lastSuccessAt: Date | null;
}> {
  const rows = await db
    .select({ status: backups.status, finishedAt: backups.finishedAt })
    .from(backups)
    .where(and(eq(backups.status, "success")))
    .orderBy(desc(backups.finishedAt))
    .limit(1);
  const total = (
    await db.select({ id: backups.id }).from(backups)
  ).length;
  return { total, lastSuccessAt: rows[0]?.finishedAt ?? null };
}
