-- Query performance tracking for the Monitoring page.
-- Requires shared_preload_libraries=pg_stat_statements (set in docker-compose).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
