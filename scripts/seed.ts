import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUser, instances } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

// Idempotent: safe to run repeatedly.
async function main() {
  // 1) Single panel admin.
  const existingAdmin = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.email, env.ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(adminUser).values({
      email: env.ADMIN_EMAIL,
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    });
    console.log(`✓ admin created: ${env.ADMIN_EMAIL}`);
  } else {
    console.log(`• admin already exists: ${env.ADMIN_EMAIL}`);
  }

  // 2) Default data-plane instance.
  const existingInstance = await db
    .select()
    .from(instances)
    .where(eq(instances.name, "default"))
    .limit(1);

  if (existingInstance.length === 0) {
    await db.insert(instances).values({
      name: "default",
      host: env.DATAPLANE_HOST,
      port: env.DATAPLANE_PORT,
      adminUser: env.DATAPLANE_ADMIN_USER,
      adminPasswordEnc: encryptSecret(env.DATAPLANE_ADMIN_PASSWORD),
      poolerHost: env.DATAPLANE_POOLER_HOST,
      poolerPort: env.DATAPLANE_POOLER_PORT,
      poolerSessionPort: env.DATAPLANE_POOLER_SESSION_PORT,
    });
    console.log("✓ default instance created");
  } else {
    console.log("• default instance already exists");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
