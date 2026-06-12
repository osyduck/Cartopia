-- Sets up the auth_query mechanism so PgBouncer can authenticate any managed
-- role against pg_shadow without us editing userlist.txt on every provision.
-- Runs once, when the dataplane-pg volume is first initialised.

CREATE ROLE pgbouncer_auth LOGIN PASSWORD 'pgbouncer_auth_pw';

CREATE SCHEMA IF NOT EXISTS pgbouncer AUTHORIZATION pgbouncer_auth;

CREATE OR REPLACE FUNCTION pgbouncer.user_lookup(
    IN i_username text,
    OUT uname text,
    OUT phash text
) RETURNS record AS $$
BEGIN
    SELECT usename, passwd
      FROM pg_catalog.pg_shadow
     WHERE usename = i_username
      INTO uname, phash;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION pgbouncer.user_lookup(text) FROM public;
GRANT EXECUTE ON FUNCTION pgbouncer.user_lookup(text) TO pgbouncer_auth;
