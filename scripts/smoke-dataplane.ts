import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import {
  createDatabase,
  createRole,
  databaseMetrics,
  setDatabaseReadOnly,
  removeRole,
  dropDatabase,
  pingInstance,
} from "@/lib/dataplane";
import { generatePassword, decryptSecret } from "@/lib/crypto";
import { adminPool } from "@/lib/dataplane/pool";
import { Client } from "pg";
import format from "pg-format";

async function main() {
  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.name, "default"))
    .limit(1);
  if (!instance) throw new Error("no default instance — run db:seed");

  console.log("ping:", await pingInstance(instance));

  const dbName = "smoke_db";
  const ownerRole = "smoke_owner";
  const readRole = "smoke_reader";

  // clean slate
  await dropDatabase(instance, dbName).catch(() => {});
  await adminPool(instance, "postgres")
    .query(format("DROP ROLE IF EXISTS %I", ownerRole))
    .catch(() => {});
  await adminPool(instance, "postgres")
    .query(format("DROP ROLE IF EXISTS %I", readRole))
    .catch(() => {});

  console.log("creating database...");
  await createDatabase(instance, {
    dbName,
    ownerRole,
    ownerPassword: generatePassword(),
    connectionLimit: 20,
  });

  // owner creates a table + row
  const ownerCheck = adminPool(instance, dbName);
  await ownerCheck.query(
    format("ALTER DATABASE %I OWNER TO %I", dbName, ownerRole),
  );
  await ownerCheck.query("CREATE TABLE IF NOT EXISTS t (id int)");
  await ownerCheck.query("INSERT INTO t VALUES (1), (2), (3)");

  console.log("adding read-only role...");
  await createRole(instance, {
    dbName,
    ownerRole,
    roleName: readRole,
    password: generatePassword(),
    mode: "read",
    connectionLimit: 5,
  });

  console.log("metrics:", await databaseMetrics(instance, dbName));

  console.log("toggling read-only on...");
  await setDatabaseReadOnly(instance, dbName, true);
  // A brand-new physical connection picks up default_transaction_read_only.
  const ro = new Client({
    host: instance.host,
    port: instance.port,
    user: instance.adminUser,
    password: decryptSecret(instance.adminPasswordEnc),
    database: dbName,
  });
  await ro.connect();
  try {
    await ro.query("INSERT INTO t VALUES (99)");
    console.log("  UNEXPECTED: write succeeded while read-only");
  } catch (e) {
    console.log("  write correctly blocked:", (e as Error).message);
  }
  // reads still work
  const cnt = await ro.query("SELECT count(*)::int AS n FROM t");
  console.log("  rows still readable:", cnt.rows[0].n);
  await ro.end();
  await setDatabaseReadOnly(instance, dbName, false);

  console.log("cleanup...");
  await removeRole(instance, { dbName, roleName: readRole });
  await dropDatabase(instance, dbName);
  await adminPool(instance, "postgres").query(
    format("DROP ROLE IF EXISTS %I", ownerRole),
  );

  console.log("✓ smoke test passed");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ smoke failed:", err);
    process.exit(1);
  });
