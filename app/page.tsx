import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Database,
  DatabaseBackup,
  Lock,
  Plug,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

// Public marketing landing. No auth, no dynamic data — fully static.
export const dynamic = "force-static";

const REPO = "https://github.com/osyduck/Cartopia";

/*
 * Cartopia landing — macrostructure: asymmetric typographic hero + workbench
 * bento. Genre: modern-minimal (dev tool / infra). Tone: technical, calm.
 * All visuals built from the locked DESIGN.md token system — no inline color
 * values, no new fonts, no fake chrome. Motion is state-only (per DESIGN.md).
 */

// ---------------------------------------------------------------------------
// Small inline GitHub mark — lucide-react dropped brand icons, so we ship a
// tiny single-path SVG (same approach as <BrandMark>). currentColor inherits.
// ---------------------------------------------------------------------------
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className ?? "size-4"}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Primary CTA — amber filled, glow ring. Hero + footer use this.
// ---------------------------------------------------------------------------
function PrimaryCta({
  href,
  children,
  withGlow = false,
}: {
  href: string;
  children: React.ReactNode;
  withGlow?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors duration-150 hover:bg-primary-hover " +
        (withGlow ? "glow-primary" : "")
      }
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Secondary CTA — quiet surface button with hairline border.
// ---------------------------------------------------------------------------
function SecondaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors duration-150 hover:border-border-strong hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle steps — genuinely ordinal (the real user lifecycle), so the
// numbering is earned, not scaffolding. Stacked vertical: number above label.
// ---------------------------------------------------------------------------
const LIFECYCLE = [
  {
    icon: Database,
    label: "Provision",
    body: "One click creates a Postgres database with a dedicated owner role, a generated password, REVOKE CONNECT FROM PUBLIC, schema ownership, and connection + statement limits.",
  },
  {
    icon: Plug,
    label: "Connect",
    body: "Three modes — transaction pooler (6432), session pooler (6433), direct (5432). Copy-as-.env, recommended pooler flagged. Role passwords are AES-GCM encrypted so they can be shown again.",
  },
  {
    icon: Activity,
    label: "Monitor",
    body: "Live active connections, cache hit ratio, size vs quota, and pg_stat_statements query performance — slowest, most time, most called.",
  },
  {
    icon: RotateCcw,
    label: "Restore",
    body: "One-click restore from any backup into a fresh managed database — owner role + metadata provisioned, pg_restore streamed from S3, rolled back on failure.",
  },
] as const;

// ---------------------------------------------------------------------------
// Bento capability tiles — varied spans, not 3 identical cards.
// ---------------------------------------------------------------------------
const QUOTA_STATES = [
  { pct: 68, tone: "bg-success", label: "healthy" },
  { pct: 94, tone: "bg-warning", label: "warn" },
  { pct: 100, tone: "bg-danger", label: "read-only" },
] as const;

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      {/* ----------------------------------------------------------------- */}
      {/* Nav — minimal masthead. Wordmark left, GitHub + Sign in right.    */}
      {/* ----------------------------------------------------------------- */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-text transition-opacity hover:opacity-90"
        >
          <BrandMark className="size-6 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Cartopia</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={REPO}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-text"
            aria-label="Cartopia on GitHub"
          >
            <GithubMark className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
          <PrimaryCta href="/login">Sign in</PrimaryCta>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Hero — asymmetric. Text left (~60%), live console preview right.  */}
      {/* NOT the centered SaaS cliché.                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Text column — left-bias, 7 of 12 cols on lg. */}
          <div className="min-w-0 lg:col-span-7">
            <p className="font-mono text-xs text-faint">
              self-hosted · postgresql · control panel
            </p>
            <h1
              className="mt-4 text-balance font-semibold leading-[1.05] tracking-tighter text-text"
              style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.25rem)" }}
            >
              Run your Postgres like a DBaaS.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              A control plane for a shared PostgreSQL server. Provision
              databases, enforce quotas, monitor, and restore — all on your own
              infra, with a single admin login.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryCta href="/login" withGlow>
                Sign in
                <ArrowRight className="size-4" />
              </PrimaryCta>
              <SecondaryCta href={REPO}>
                <GithubMark className="size-4" />
                Read the source
              </SecondaryCta>
            </div>
            <p className="mt-4 text-xs text-faint">
              Deploy with docker compose. No telemetry, no SaaS dependency.
            </p>
          </div>

          {/* Console preview — real-looking panel data, no fake chrome. */}
          <div className="min-w-0 lg:col-span-5">
            <div className="rounded-xl border border-border bg-surface elevation-2">
              {/* Panel header — one quiet label, not an eyebrow on every section. */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-wide text-faint">
                  databases
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-faint">
                  <span className="size-1.5 rounded-full bg-success" />
                  live
                </span>
              </div>

              {/* Rows — real status semantics (success / warning / danger). */}
              <ul className="divide-y divide-border/60">
                <DbPreviewRow
                  name="tenant_app"
                  statusDot="bg-success"
                  pct={68}
                  barTone="bg-success"
                  conn="12 / 20"
                />
                <DbPreviewRow
                  name="analytics"
                  statusDot="bg-warning"
                  pct={94}
                  barTone="bg-warning"
                  conn="8 / 15"
                />
                <DbPreviewRow
                  name="reports"
                  statusDot="bg-danger"
                  pct={100}
                  barTone="bg-danger"
                  conn="5 / 10"
                  badge="READ-ONLY"
                />
                <DbPreviewRow
                  name="staging"
                  statusDot="bg-faint"
                  pct={23}
                  barTone="bg-success"
                  conn="3 / 10"
                />
              </ul>

              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <span className="font-mono text-xs text-faint">
                  last sweep · 38s ago
                </span>
                <span className="font-mono text-xs text-muted">4 databases</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Lifecycle — Provision → Connect → Monitor → Restore.              */}
      {/* Genuinely ordinal content, so numbered badges are earned.          */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-y border-border bg-surface/30">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              The lifecycle, from zero to restored.
            </h2>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
              Four steps, all inside the browser. This is the actual user
              flow — not a marketing funnel.
            </p>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {LIFECYCLE.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="relative flex flex-col">
                  {/* Number node on a connecting rail (lg only) — reads as a flow, not a card grid. */}
                  <div className="flex items-center gap-3">
                    <span className="relative z-10 inline-flex size-9 items-center justify-center rounded-full border border-primary/40 bg-surface font-mono text-sm font-semibold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    {i < LIFECYCLE.length - 1 && (
                      <span
                        className="hidden h-px flex-1 bg-border lg:block"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Icon className="size-4 text-muted" aria-hidden="true" />
                    <h3 className="text-base font-semibold text-text">
                      {step.label}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Capabilities bento — 6 varied tiles, not 3 identical cards.       */}
      {/* 6-col grid on lg: A(4) B(2,rows1-2) C(2) D(2) E(4) F(2).           */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Built for the work, not the demo.
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
            Every capability here ships today. No roadmapped bullets posing as
            features.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {/* A — Provision (wide, span 4) */}
          <BentoTile
            icon={Database}
            title="Provision in one click"
            className="lg:col-span-4"
          >
            <p className="text-sm leading-relaxed text-muted">
              Creates a Postgres database with a dedicated owner role, a
              generated password, <Code>REVOKE CONNECT FROM PUBLIC</Code>,
              schema ownership, and connection + statement limits. Returns
              ready-to-use connection strings for all three pooler modes.
            </p>
          </BentoTile>

          {/* B — Quota enforcement (tall, span 2 rows) */}
          <BentoTile
            icon={ShieldAlert}
            title="Soft quota enforcement"
            className="lg:col-span-2 lg:row-span-2"
          >
            <p className="text-sm leading-relaxed text-muted">
              Per-database storage quota with a warn → read-only → recover
              state machine. Over-quota databases go read-only automatically
              and kick live sessions; recover when space drops back under 95%.
            </p>
            <div className="mt-5 space-y-3">
              {QUOTA_STATES.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted">{s.label}</span>
                    <span className="font-mono tabular-nums text-faint">
                      {s.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={"h-full rounded-full " + s.tone}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-faint">
              Hysteresis: enforce at 100%, recover under 95%.
            </p>
          </BentoTile>

          {/* C — Monitoring (span 2) */}
          <BentoTile
            icon={Activity}
            title="Monitoring"
            className="lg:col-span-2"
          >
            <p className="text-sm leading-relaxed text-muted">
              Live active connections, cache hit ratio, size vs quota, and
              pg_stat_statements query performance — slowest, most time, most
              called.
            </p>
            <div className="mt-4 space-y-2.5">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted">cache hit</span>
                  <span className="font-mono tabular-nums text-success">
                    97.5%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: "97.5%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted">connections</span>
                  <span className="font-mono tabular-nums text-muted">
                    12 / 20
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>
          </BentoTile>

          {/* D — Backups & restore (span 2) */}
          <BentoTile
            icon={DatabaseBackup}
            title="Backups & restore"
            className="lg:col-span-2"
          >
            <p className="text-sm leading-relaxed text-muted">
              Daily scheduled <Code>pg_dump -Fc</Code> streamed to S3 (MinIO),
              rolling 7-day retention, one-click restore to a fresh database.
              Download the raw <Code>.dump</Code> anytime.
            </p>
          </BentoTile>

          {/* E — Connection methods (wide, span 4) */}
          <BentoTile
            icon={Plug}
            title="Three connection methods"
            className="lg:col-span-4"
          >
            <p className="text-sm leading-relaxed text-muted">
              Transaction pooler, session pooler, and direct — each broken out
              by host, port, database, username, password, and full connection
              string. Copy-as-.env, recommended pooler flagged.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                transaction · 6432
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">
                session · 6433
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">
                direct · 5432
              </span>
            </div>
          </BentoTile>

          {/* F — Audit log (span 2) */}
          <BentoTile
            icon={ScrollText}
            title="Audit log"
            className="lg:col-span-2"
          >
            <p className="text-sm leading-relaxed text-muted">
              Every admin action — database created, role added, password
              reset, restore, quota sweep — recorded with actor and timestamp.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-muted">
              <code>{`14:32  db.create    tenant_app
14:28  role.reset   analytics_ro
14:15  backup.now   reports`}</code>
            </pre>
          </BentoTile>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Terminal + self-hosted — 2 columns. Plain <pre>, no fake chrome.  */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left — terminal snippet */}
            <div>
              <div className="flex items-center gap-2 text-muted">
                <Terminal className="size-4" aria-hidden="true" />
                <span className="text-sm font-medium">Bring it up</span>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-muted">
                <code>{`docker compose up -d
# → metadata DB, dataplane Postgres, PgBouncer, Redis, MinIO
# → open https://localhost:3000 → sign in as admin

npm run db:migrate && npm run db:seed
npm run dev      # control panel
npm run worker   # quota + monitor + backup jobs`}</code>
              </pre>
              <p className="mt-3 text-xs text-faint">
                Five services, one compose file. Your data stays on your node.
              </p>
            </div>

            {/* Right — self-hosted statement + architecture sketch */}
            <div>
              <div className="flex items-center gap-2 text-muted">
                <Lock className="size-4" aria-hidden="true" />
                <span className="text-sm font-medium">Your data stays yours</span>
              </div>
              <p className="mt-4 text-pretty text-sm leading-relaxed text-muted sm:text-base">
                Cartopia runs entirely on your own infra. Single admin login,
                no telemetry, no SaaS dependency, no vendor lock-in.
                Cross-database isolation is enforced — tenant roles can&apos;t
                connect to other databases or to the maintenance databases.
              </p>

              {/* Architecture sketch — hand-built SVG, no fake chrome. */}
              <figure className="mt-6 rounded-lg border border-border bg-surface p-4">
                <figcaption className="mb-3 font-mono text-xs uppercase tracking-wide text-faint">
                  architecture
                </figcaption>
                <ArchitectureDiagram />
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Closing CTA — quiet band. NOT a giant gradient banner.            */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="rounded-xl border border-border bg-surface elevation-1 px-6 py-10 sm:px-12 sm:py-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-balance text-xl font-semibold tracking-tight text-text sm:text-2xl">
                Bring it up in five minutes.
              </h2>
              <p className="mt-2 text-sm text-muted">
                Clone, compose, migrate, sign in. That&apos;s the whole setup.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryCta href="/login" withGlow>
                Sign in
                <ArrowRight className="size-4" />
              </PrimaryCta>
              <Link
                href={REPO}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-text"
              >
                <GithubMark className="size-4" />
                osyduck/Cartopia
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Footer — quiet. Wordmark + one line + links. NOT a 4-col farm.    */}
      {/* ----------------------------------------------------------------- */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-text transition-opacity hover:opacity-90"
          >
            <BrandMark className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Cartopia</span>
          </Link>
          <p className="text-xs text-faint">
            Self-hosted PostgreSQL control panel.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted transition-colors hover:text-text"
            >
              Sign in
            </Link>
            <Link
              href={REPO}
              className="text-sm font-medium text-muted transition-colors hover:text-text"
              aria-label="Cartopia on GitHub"
            >
              <GithubMark className="size-4" />
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Preview-row subcomponent for the hero console panel.
// ---------------------------------------------------------------------------
function DbPreviewRow({
  name,
  statusDot,
  pct,
  barTone,
  conn,
  badge,
}: {
  name: string;
  statusDot: string;
  pct: number;
  barTone: string;
  conn: string;
  badge?: string;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={"size-1.5 shrink-0 rounded-full " + statusDot} />
          <span className="truncate font-mono text-xs text-text">{name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {badge && (
            <span className="rounded-md border border-danger/30 bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-danger">
              {badge}
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-faint">
            {conn}
          </span>
        </div>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={"h-full rounded-full " + barTone}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Bento tile — consistent shell, varied span via className prop.
// ---------------------------------------------------------------------------
function BentoTile({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={
        "flex flex-col rounded-xl border border-border bg-surface elevation-1 p-5 transition-shadow hover:elevation-2 sm:p-6 " +
        className
      }
    >
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Inline code chip — matches DESIGN.md spec.
// ---------------------------------------------------------------------------
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text">
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Architecture diagram — hand-built SVG using token colors. No fake chrome.
// control plane (top) vs data plane (bottom), separated by a hairline.
// ---------------------------------------------------------------------------
function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 360 200"
      className="w-full"
      role="img"
      aria-label="Cartopia architecture: browser connects to the Cartopia control panel, which talks to a metadata database on the control plane, and to a dataplane Postgres through PgBouncer on the data plane."
    >
      {/* Control plane band */}
      <rect
        x="8"
        y="10"
        width="344"
        height="80"
        rx="8"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="1"
      />
      <text
        x="16"
        y="24"
        fill="var(--color-faint)"
        fontSize="9"
        fontFamily="var(--font-mono)"
        letterSpacing="0.05em"
      >
        CONTROL PLANE
      </text>

      {/* Browser node */}
      <DiagramBox x={20} y={38} w={80} h={38} label="Browser" />
      <DiagramBox
        x={140}
        y={38}
        w={96}
        h={38}
        label="Cartopia"
        sub="Next.js"
        accent
      />
      <DiagramBox
        x={260}
        y={38}
        w={80}
        h={38}
        label="Metadata DB"
        sub="postgres"
      />
      <DiagramLine x1={100} y1={57} x2={140} y2={57} />
      <DiagramLine x1={236} y1={57} x2={260} y2={57} />

      {/* Data plane band */}
      <rect
        x="8"
        y="110"
        width="344"
        height="80"
        rx="8"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="1"
      />
      <text
        x="16"
        y="124"
        fill="var(--color-faint)"
        fontSize="9"
        fontFamily="var(--font-mono)"
        letterSpacing="0.05em"
      >
        DATA PLANE
      </text>

      <DiagramBox x={20} y={138} w={80} h={38} label="apps" />
      <DiagramBox
        x={140}
        y={138}
        w={96}
        h={38}
        label="PgBouncer"
        sub="pooler"
      />
      <DiagramBox
        x={260}
        y={138}
        w={80}
        h={38}
        label="Dataplane PG"
        sub="tenant dbs"
        accent
      />
      <DiagramLine x1={100} y1={157} x2={140} y2={157} />
      <DiagramLine x1={236} y1={157} x2={260} y2={157} />

      {/* Cross-plane link — Cartopia → dataplane (admin DDL) */}
      <path
        d="M188 76 L188 110 L260 110 L260 138"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.7"
      />
    </svg>
  );
}

function DiagramBox({
  x,
  y,
  w,
  h,
  label,
  sub,
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="6"
        fill={accent ? "var(--color-primary-tint)" : "var(--color-surface-2)"}
        stroke={accent ? "var(--color-primary)" : "var(--color-border-strong)"}
        strokeWidth="1"
      />
      <text
        x={x + w / 2}
        y={y + (sub ? 17 : 22)}
        textAnchor="middle"
        fill="var(--color-text)"
        fontSize="11"
        fontFamily="var(--font-sans)"
        fontWeight="600"
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + 30}
          textAnchor="middle"
          fill="var(--color-faint)"
          fontSize="9"
          fontFamily="var(--font-mono)"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function DiagramLine({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--color-border-strong)"
      strokeWidth="1"
    />
  );
}
