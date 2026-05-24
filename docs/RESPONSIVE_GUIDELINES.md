# Responsive guidelines — Ponti FE

Patterns codified by the Fase 0-6 refactor (May 2026). Every new component
or page should follow these.

## Breakpoints

Single source of truth: [`tailwind.config.js`](../ui/tailwind.config.js)
+ [`src/hooks/useBreakpoint.ts`](../ui/src/hooks/useBreakpoint.ts).

| Token | Width | Target |
|---|---|---|
| `xs` | 375px | iPhone SE / mini |
| `sm` | 640px | (Tailwind default) |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / small laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | (Tailwind default) |
| `3xl` | 1920px | Full-HD large |

**Never** use `window.innerWidth` directly. Use `useIsMobile()` (`<md`) or
`useBreakpoint()` (returns current token) — both subscribe to `matchMedia`
so they stay in sync with CSS breakpoints.

## Mobile-first writing

Always write CSS classes **without prefix for mobile** and add `md:` /
`lg:` / `xl:` prefixes for progressive enhancement. Do NOT write
desktop-first with mobile overrides.

```tsx
// ✓ Good — mobile is the default, desktop adds
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" />

// ✗ Bad — desktop-first, mobile is an afterthought
<div className="grid grid-cols-4 gap-4 max-md:grid-cols-1" />
```

## Layout primitives

Use the shared primitives in [`src/components/layout/`](../ui/src/components/layout/)
before reinventing grids:

- `<Stack>` — flex vertical (default) or horizontal with gap
- `<Cluster>` — horizontal flex with wrap (KPIs, action buttons)
- `<Grid>` — `repeat(auto-fit, minmax(min(X, 100%), 1fr))`
- `<Container>` — centered max-width wrapper with responsive padding
- `<PageShell>` — page chrome (header / toolbar / body / footer slots)
- `<FormSection>` — section with title, description, actions, body

## Tables

Use `<ResponsiveTable>` from [`src/components/crud/ResponsiveTable.tsx`](../ui/src/components/crud/ResponsiveTable.tsx).
Same `Column<T>` config drives the desktop DataTable and the mobile
card stack. No duplication.

```tsx
<ResponsiveTable<MyType>
  data={items}
  columns={cols}
  pagination={pagination.buildPagination(items.length)}
  primaryKey="name"           // mobile card title
  rowKey={(r) => r.id}
  emptyMessage="Sin resultados"
/>
```

Columns with `header: ""` (e.g. the bulk-select checkbox column) get
auto-rendered as ornaments top-right of each card instead of in the
field list.

For wide static tables (reports, dashboards) that can't be split into
cards, wrap them in `<ScrollableTable>` (gradient hint + "← Desliza →"
text on mobile).

## Modals & drawers

- `<BaseModal>` accepts a `size` prop (`sm` / `md` / `lg` / `xl`). Mobile
  always full-width with margin; desktop caps at the chosen size.
- `<DrawerShell>` (used by `EntityFormDrawer`) is full-screen on mobile,
  capped at `md:max-w-2xl lg:max-w-3xl 2xl:max-w-4xl` on desktop. No
  hardcoded `width: 70vw`.

## Z-index

Use the scale in [`tailwind.config.js`](../ui/tailwind.config.js), never
`z-[1000]` style arbitrary values:

```
z-base / z-sticky / z-dropdown / z-navbar / z-nav-menu /
z-drawer / z-modal / z-popover / z-tooltip / z-notification
```

CI enforces this via [`scripts/lint-responsive-antipatterns.sh`](../ui/scripts/lint-responsive-antipatterns.sh).

## Forbidden patterns (lint-enforced)

- ❌ `z-[123]` arbitrary → use the scale
- ❌ `window.innerWidth` raw → use `useIsMobile()` / `useBreakpoint()`
- ⚠️ `w-[Npx]` / `h-[Npx]` / `min-w-[Npx]` / `max-w-[Npx]` — currently
  warned with baseline count; convert to FAIL when count hits 0.

## iOS Safari

- All inputs/selects/textareas get `font-size: 16px` on `<md` via a
  global CSS rule (prevents iOS Safari's auto-zoom on focus). Don't
  override this in per-component styles.
- Use `h-[100dvh]` instead of `h-screen` for full-viewport-height
  containers (avoids the URL bar gap on iOS).

## Touch targets

Minimum 44×44px for any button or interactive element on mobile (Apple
HIG). Most icon buttons already use `h-10 w-10` (40) which is borderline
acceptable; bump to `h-11 w-11` (44) for primary actions.

## PDF export

The dashboard PDF target is hardcoded at `w-[1280px]` (landscape desktop
layout). Mobile users get a `notify.info` instead of triggering a
cropped export. This is **intentional** per the responsive plan — PDF
quality requires a fixed wide layout, and mocking that on mobile
generates illegible files.

## Code-splitting

Heavy pages (>500 LoC) that aren't embedded as drawers in other pages
should be `React.lazy`'d in [`src/router.tsx`](../ui/src/router.tsx).
Pages embedded as drawers (e.g. `CustomerEditor` in Lots / FieldsList /
CustomersList) must stay eager — a lazy import there yields no chunk
separation (Rollup still bundles them via the static import) and only
adds Suspense flicker.

## When in doubt

1. Test at 375 (iPhone SE), 768 (iPad portrait), 1280 (laptop), 1920 (large).
2. Run `npm run lint` — the responsive guard will flag obvious mistakes.
3. Add a Playwright spec asserting `expectNoHorizontalScroll` if your
   change touches a wide layout. See
   [`customer-editor-responsive.spec.ts`](../ui/e2e/customer-editor-responsive.spec.ts)
   as a template.
