declare module "pg-format" {
  /**
   * sprintf-style formatter with Postgres-aware specifiers:
   *   %I  quoted identifier
   *   %L  quoted literal
   *   %s  raw string
   */
  function format(fmt: string, ...args: unknown[]): string;
  export = format;
}
