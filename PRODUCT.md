# Product

## Register

product

## Users

Engineers and small ops teams self-hosting a shared PostgreSQL server for
multiple tenants/apps. They open Cartopia under pressure — a database hit
quota, a backup failed, a connection is stuck — and need to diagnose and
act fast. Primary context: laptop, 3am pager, single admin login, dark room.
Secondary context: daytime provisioning of new databases and roles for new
apps. They are fluent in Postgres and expect tooling that respects their
expertise; they hate admin UIs that hide SQL details or invent friction.

## Product Purpose

Cartopia is a self-hosted PostgreSQL DBaaS control panel — a mini, self-hosted
DigitalOcean Managed Databases. One web UI to provision and manage many
databases + roles on a shared PostgreSQL server, with quota enforcement,
monitoring, backups, and restore. Success: an engineer can provision a new
tenant database in under 30 seconds, see fleet health at a glance, and recover
from a bad migration via one-click restore without leaving the browser.

## Brand Personality

Calm authority, precise, trustworthy under pressure. The tool disappears into
the task — it never performs, it just works. Warm but not cozy (this is ops,
not a lifestyle app); confident but not loud. Three words: **steady, precise,
warm-instrument**. Emotional goal: "I trust this console at 3am."

## Anti-references

- Generic SaaS-blue dashboards (Vercel-template dark + blue primary) — the
  thing we are replacing.
- Supabase green-on-near-black — too saturated, too identifiably "Supabase."
- Notion/Linear clones with cream-paper bg — wrong register for an ops tool.
- Grafana's default dashboard aesthetic — competent but visually noisy,
  inconsistent affordances, no craft.
- Any admin UI that uses emoji as primary iconography.

## Design Principles

1. **Earned familiarity.** Standard affordances, executed with craft. Same
   button shape, same form vocabulary, same icon style across every screen.
   No reinvented modals or custom scrollbars. The bar is Linear/Vercel/Stripe,
   not "different."
2. **Legibility under pressure.** Body text ≥4.5:1, status colors that mean
   what they say, dense data tables that stay scannable. An engineer at 3am
   with one eye open must not squint.
3. **Depth, not decoration.** Layered surfaces and purposeful motion convey
   state and hierarchy. No flat-but-busy; no decorative glassmorphism. Every
   shadow and transition earns its place.
4. **Steady rhythm.** Spacing varies for breathing room; type scale is fixed
   and tight. The console feels composed, not cluttered.
5. **Amber as identity, not alarm.** The honey-amber brand color is the
   primary action and selection signal. It must stay visually distinct from
   the warning/gold semantic so "brand" and "alert" never blur.

## Accessibility & Inclusion

- WCAG AA contrast (body ≥4.5:1, large ≥3:1, muted ≥3.5:1) on the dark theme.
- `prefers-reduced-motion` respected on every animation (crossfade or instant
  fallback, never gated content).
- Keyboard-navigable nav, tabs, and forms; visible focus rings.
- Color never the only signal — status badges pair color with text labels.
- tabular-nums on all numeric data for alignment.
