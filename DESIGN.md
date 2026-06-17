# Cartopia Design System

The visual source of truth. Every surface is built from this. Read PRODUCT.md
for the strategic context (register, users, principles) first.

## Theme

Dark, single theme. Mood: network operations center at 3am — calm authority,
amber on graphite, everything legible under pressure.

Color strategy: **Committed**. The honey-amber primary carries identity
(primary actions, selection, active states). The bg is pure-neutral dark
graphite (chroma 0) — no warm-cream cliché. Depth comes from layered surfaces
and elevation shadows, not from tinting the bg.

## Color tokens (OKLCH, defined in `app/globals.css`)

Available as Tailwind utilities (`bg-*`, `text-*`, `border-*`).

| Token | Value | Use |
|---|---|---|
| `bg` | `oklch(0.14 0 0)` | app background (pure neutral) |
| `surface` | `oklch(0.18 0.004 55)` | cards, panels, sidebar |
| `surface-2` | `oklch(0.22 0.006 55)` | inputs, insets, hover |
| `surface-3` | `oklch(0.26 0.009 55)` | raised hover, active fills |
| `border` | `oklch(0.28 0.008 55)` | default 1px borders |
| `border-strong` | `oklch(0.34 0.010 55)` | hover/emphasized borders |
| `text` | `oklch(0.93 0.006 55)` | body text (~10:1 vs bg) |
| `muted` | `oklch(0.70 0.010 55)` | secondary text (~4:1) |
| `faint` | `oklch(0.52 0.008 55)` | tertiary/disabled, icon rest state |
| `primary` | `oklch(0.70 0.150 52)` | honey amber — CTAs, selection, active |
| `primary-hover` | `oklch(0.74 0.155 52)` | primary button hover |
| `primary-fg` | `oklch(0.10 0 0)` | dark ink text on primary fills |
| `accent` | `oklch(0.74 0.110 200)` | cool teal — rare secondary highlight |
| `success` | `oklch(0.74 0.150 155)` | green — healthy/active state |
| `warning` | `oklch(0.82 0.145 92)` | gold — approaching quota (hue 92, distinct from primary 52) |
| `danger` | `oklch(0.64 0.200 25)` | red — over quota, destructive |
| `info` | `oklch(0.72 0.110 235)` | blue — info callouts |

Opacity tints: `bg-primary/14`, `text-success`, `border-danger/25`, etc.

## Depth (elevation utilities — replaces flat border-only cards)

- `elevation-1` — default for cards/panels/stat cards. Subtle inset top highlight + small shadow.
- `elevation-2` — raised cards on hover, important panels.
- `elevation-3` — modals, popovers (not used yet).
- `glow-primary` — amber glow ring. **Only on primary buttons** (already baked into SubmitButton).

Use `rounded-xl border border-border bg-surface elevation-1` for cards. Add
`transition-shadow hover:elevation-2` for interactive cards. Do NOT use flat
`border border-border bg-surface` with no shadow — that was the old rigid look.

## Typography

One family: **Geist Sans** (already loaded in `app/layout.tsx` via next/font).
Geist Mono for code/data/identifiers. Fixed rem scale (no fluid clamp).

| Element | Classes |
|---|---|
| Page title (h1) | `text-xl font-semibold tracking-tight` |
| Section title (h2) | `text-base font-semibold` |
| Subsection (h3) | `text-sm font-semibold` |
| Body | `text-sm` (default) |
| Label | `text-sm text-muted` |
| Helper/hint | `text-xs text-faint` |
| Code/identifier | `font-mono text-xs` or `<code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">` |
| Stat value | `text-2xl font-semibold tabular-nums` |
| Overline (use SPARINGLY, not on every section) | `text-xs font-medium uppercase tracking-wide text-faint` |

Body line length 65–75ch for prose; data tables can run denser.

## Radii (vary by element — do NOT round-2xl everything)

- `rounded-md` — small chips, copy buttons
- `rounded-lg` — buttons, inputs, select, small pills
- `rounded-xl` — cards, panels, stat cards, table wrappers
- `rounded-full` — status dots, badges, progress bar tracks

## Shared components (import, do not reinvent)

### `<Badge>` — `@/components/badge`
```tsx
<Badge tone="success|warning|danger|muted|primary|info" dot>label</Badge>
```
Bordered pill. `dot` adds a leading colored dot (good for status).

### `<SubmitButton>` — `@/components/submit-button`
```tsx
<SubmitButton variant="primary|secondary|ghost|danger" size="sm|md" pendingText="...">Label</SubmitButton>
```
Uses `useFormStatus`. Has lucide `Loader2` spinner when pending. Primary variant has amber glow.

### `<ActionForm>` — `@/components/action-form`
```tsx
<ActionForm action={fn} label="..." pendingText="..." variant="..." confirm="...?">
  <input type="hidden" ... />
</ActionForm>
```
Wraps SubmitButton. `confirm` triggers `window.confirm`.

### `<CopyButton>` — `@/components/copy-button`
```tsx
<CopyButton value="..." label="Copy" />
```
Lucide Copy/Check icons. Shows "Tersalin" for 1.5s.

### `<RefreshButton>` — `@/components/refresh-button`
```tsx
<RefreshButton label="Refresh" />
```
Lucide RefreshCw, spins while refreshing.

### `<BrandMark>` — `@/components/brand-mark`
```tsx
<BrandMark className="size-7 text-primary" />
```
Abstract database + node SVG. **Replaces ALL 🐘 emoji.** Inherits currentColor.

### `<NavLink>` — `@/components/nav-link`
```tsx
<NavLink href="/" icon={LayoutDashboard}>Overview</NavLink>
```
`icon` is a **LucideIcon** (not string). Active state: amber bar + tinted bg.

### `<DbTabs>` — `@/components/db-tabs`
```tsx
<DbTabs base={base} tabs={[
  { href: base, label: "Overview", icon: Database },
  { href: `${base}/monitor`, label: "Monitor", icon: Activity },
  ...
]} />
```
`icon` is a LucideIcon.

### `<SecretReveal>` — `@/components/secret-reveal`
```tsx
<SecretReveal data={state.reveal} />
```
API unchanged. (Being redesigned by the db-detail-tabs agent — keep the same
props: `{ data: SecretRevealData }`.)

## Icon system

`lucide-react`. Import named icons. Render `<Icon className="size-4" />`.

**Mapping (replace ALL emoji):**
| Emoji | Lucide icon |
|---|---|
| 🐘 | `<BrandMark>` component (not an icon) |
| ▦ | `LayoutDashboard` |
| 🗄 | `Database` |
| 📜 | `ScrollText` |
| ⎋ | `LogOut` |
| ↻ | `RefreshCw` |
| + | `Plus` |
| ⚠ | `AlertTriangle` |
| ▲ / ▼ | `ChevronUp` / `ChevronDown` |
| ← | `ArrowLeft` |
| ✓ | `Check` |
| ℹ | `Info` |
| 📊 | `Activity` (monitor) |
| 💾 | `Archive` (backups) — or `DatabaseBackup` |
| ⚙ | `Settings` |
| ↺ | `RotateCcw` (restore) |
| 🔍 | `Search` |

NEVER use emoji for UI. Inline emoji in body copy (e.g. none currently) is fine; UI affordance emoji must go.

## Layout patterns

### Page header
```tsx
<div className="flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 className="text-xl font-semibold tracking-tight">Title</h1>
    <p className="mt-1 text-sm text-muted">subtitle</p>
  </div>
  <div className="flex items-center gap-2">{/* actions */}</div>
</div>
```

### Stat card
```tsx
<div className="rounded-xl border border-border bg-surface elevation-1 p-5">
  <div className="text-sm text-muted">Label</div>
  <div className="mt-1 text-2xl font-semibold tabular-nums">value</div>
  <div className="text-xs text-faint">helper</div>
  {/* optional progress bar */}
  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
    <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
  </div>
</div>
```

### Table
```tsx
<div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
  <table className="w-full text-sm">
    <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
      <tr>
        <th className="px-4 py-3 font-medium">Header</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/40">
        <td className="px-4 py-3">cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Form field
```tsx
<label className="space-y-1.5">
  <span className="text-sm text-muted">Label</span>
  <input
    name="..."
    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
  />
  <span className="text-xs text-faint">hint</span>
</label>
```

### Progress bar (health)
```tsx
<div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
  <div
    className={cn(
      "h-full rounded-full transition-[width] duration-300",
      pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success",
    )}
    style={{ width: `${Math.min(100, pct)}%` }}
  />
</div>
```

### Callouts
- Error: `rounded-lg border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger`
- Success: `rounded-lg border border-success/25 bg-success/8 px-3 py-2`
- Warning/alert: `rounded-lg border border-warning/25 bg-warning/8 px-3 py-2`
- Info: `rounded-lg border border-info/20 bg-info/8 px-3 py-2`

### Empty state
```tsx
<div className="rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
  <p className="text-sm text-muted">Belum ada ...</p>
  <Link href="..." className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
    Buat yang pertama →
  </Link>
</div>
```

## Motion (product register: 150–250ms, state only)

- Hover/active: `transition-colors duration-150`
- Width changes (progress bars): `transition-[width] duration-300`
- Drawer/slide: `transition-transform duration-200 ease-out`
- Loading: lucide `Loader2` / `RefreshCw` with `animate-spin`
- NO page-load choreography. NO decorative motion. NO reveal-on-scroll gating.
- `prefers-reduced-motion` handled globally in globals.css.

## Absolute bans (from impeccable)

- No side-stripe borders (`border-l` accent > 1px).
- No gradient text (`background-clip: text` + gradient).
- No glassmorphism as default (rare/purposeful or none).
- No hero-metric template (big number + gradient + supporting stats cliché).
- No identical card grids (icon+heading+text repeated) — vary the layout.
- No tiny uppercase tracked eyebrow above EVERY section.
- No numbered section markers (01/02/03) as default scaffolding.
- No text overflow on mobile — test headings at every breakpoint.
- No `as any` / `@ts-ignore` / `@ts-expect-error`.
- No empty catch blocks.
- No emoji as UI icons.
- No `rounded-2xl` on everything — vary radii per element type.

## Constraints

- Keep ALL existing server-component logic intact: data fetching, `params`/`await`, server actions, `useActionState`/`useFormStatus`. Only redesign JSX + className + icons.
- Keep ALL Indonesian UI copy as-is (do not translate to English).
- Keep all `export const dynamic = "force-dynamic"` directives.
- Keep all imports working. If you change a component's API (e.g. add a prop), update every caller in YOUR assigned files only — other agents own their files.
- Run `lsp_diagnostics` on your files after editing; fix errors you introduced (pre-existing `globals.css` Tailwind-syntax warnings are false-positives, ignore them).
