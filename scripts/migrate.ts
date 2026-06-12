import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.METADATA_DATABASE_URL;
  if (!url) throw new Error("METADATA_DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
