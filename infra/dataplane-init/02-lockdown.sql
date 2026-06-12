-- Tenant roles must not be able to reach the maintenance/template databases,
-- which would leak the catalog (other databases, roles, etc). initdb grants
-- PUBLIC CONNECT on these — revoke it. Superusers (our control plane) and the
-- PgBouncer auth_user are unaffected / re-granted.

REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;

-- auth_query runs as pgbouncer_auth against the "postgres" database.
GRANT CONNECT ON DATABASE postgres TO pgbouncer_auth;
