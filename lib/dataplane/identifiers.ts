// Strict allowlist for any name that becomes a PostgreSQL identifier (database
// or role). This is the FIRST line of defence — even though we also quote with
// pg-format's %I, we never let a questionable name reach the data plane.
//
// Lowercase letters/digits/underscore, must start with a letter or underscore,
// max 63 bytes (Postgres NAMEDATALEN limit).
const IDENTIFIER_RE = /^[a-z_][a-z0-9_]{0,62}$/;

const RESERVED = new Set([
  "postgres",
  "template0",
  "template1",
  "public",
  "pgbouncer",
  "pgbouncer_auth",
  "root",
  "admin",
  "session_user",
  "current_user",
]);

export function isValidIdentifier(name: string): boolean {
  return (
    IDENTIFIER_RE.test(name) &&
    !name.startsWith("pg_") &&
    !RESERVED.has(name)
  );
}

/** Throws if `name` is not a safe identifier. Returns it on success. */
export function assertIdentifier(name: string, kind = "name"): string {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(
      `Invalid ${kind} "${name}": use lowercase letters, digits and underscores (start with a letter), max 63 chars.`,
    );
  }
  if (name.startsWith("pg_")) {
    throw new Error(`Invalid ${kind} "${name}": cannot start with "pg_".`);
  }
  if (RESERVED.has(name)) {
    throw new Error(`Invalid ${kind} "${name}": this name is reserved.`);
  }
  return name;
}
