# Design tokens

Colour, type, and spacing live in `src/index.css`. That file is the Tailwind theme.

## Tokens

| Token | CSS variable | Tailwind |
| --- | --- | --- |
| Canvas | `--background` | `bg-background` |
| Foreground | `--foreground` | `text-foreground` |
| Primary | `--primary` `#059669` | `bg-primary`, `text-primary` |
| Primary hover | `--primary-hover` `#047857` | `bg-primary-hover` |
| Primary foreground | `--primary-foreground` | `text-primary-foreground` |
| Card | `--card` | `bg-card` |
| Muted canvas | `--muted` | `bg-muted` |
| Muted text | `--muted-foreground` | `text-muted-foreground` |
| Destructive | `--destructive` | `text-destructive`, `bg-destructive` |
| Leave types | `--leave-annual` … `--leave-study` | `bg-leave-annual` … |
| Success | `--color-success` | `text-success`, `bg-success` |
| Warning | `--color-warning` | `text-warning`, `bg-warning` |
| Badge pending | `--color-badge-pending` | `bg-badge-pending` |
| Badge approved | `--color-badge-approved` | `bg-badge-approved` |
| Badge rejected | `--color-badge-rejected` | `bg-badge-rejected` |
| Badge waiting | `--color-badge-waiting` | `bg-badge-waiting` |
| Badge pending HR | `--color-badge-pending-hr` | `bg-badge-pending-hr` |
| Disabled opacity | `--opacity-disabled` | `opacity-disabled` |
| Font | `--font-sans` | `font-sans` (Plus Jakarta Sans) |
| Page title | `--text-title` | `text-title` |
| Small title | `--text-title-sm` | `text-title-sm` |
| Body | `--text-body` | `text-body` |
| Field gap | `--spacing-field` | `gap-field` |
| Stack gap | `--spacing-stack` | `gap-stack` |
| Section | `--spacing-section` | `p-section` |
| Page | `--spacing-page` | `p-page` |

The palette follows Calm HR layout with an emerald product theme: stone canvas `#faf8f5`, emerald brand `#059669`, white cards, Plus Jakarta Sans, and status pills (pending amber, approved emerald, declined rose, cancelled slate, awaiting HR sky). A company can override the brand colour and logo. Existing shared components retain compatibility aliases such as `--color-primary`, `--color-surface`, and `--color-danger`.

## Rules

- No raw hex in a feature page if a token exists. Put a new value in `src/index.css` instead.
- Every field has a visible label (use `TextField`, `Select`, `DateField`, or `FileSlot`).
- Do not add screens that are not on the route list.
- Empty and error banners use shared `Alert` and `EmptyState`.
- Focus rings use `--ring` (or its `--color-focus` alias) on `:focus-visible`. Do not set `outline: none` without a visible replacement.
- Disabled buttons and fields use `--opacity-disabled` and muted fill. Native `disabled` is enough; do not add new props.
- StatusBadge colours are `--color-badge-*`. Colour the chip, not the table row.
- Signed-in chrome is the Calm HR top bar. Public auth chrome is the centred card shell.

## Where hex is allowed

Only in `src/index.css`. Shared component CSS and pages must use `var(--color-…)` or the matching utility.
