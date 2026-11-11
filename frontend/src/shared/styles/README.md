# Design tokens

Colour, type, and spacing live in `theme.css`. That file is the Tailwind theme.

## Tokens

| Token | CSS variable | Tailwind |
| --- | --- | --- |
| Canvas | `--background` | `bg-background` |
| Foreground | `--foreground` | `text-foreground` |
| Primary | `--primary` | `bg-primary`, `text-primary` |
| Primary foreground | `--primary-foreground` | `text-primary-foreground` |
| Card | `--card` | `bg-card` |
| Muted canvas | `--muted` | `bg-muted` |
| Muted text | `--muted-foreground` | `text-muted-foreground` |
| Destructive | `--destructive` | `text-destructive`, `bg-destructive` |
| Sidebar | `--sidebar` | `bg-sidebar`, `text-sidebar-foreground` |
| Charts | `--chart-1`…`--chart-5` | `bg-chart-1`…`bg-chart-5` |
| Success | `--color-success` | `text-success`, `bg-success` |
| Warning | `--color-warning` | `text-warning`, `bg-warning` |
| Badge pending | `--color-badge-pending` | `bg-badge-pending` |
| Badge approved | `--color-badge-approved` | `bg-badge-approved` |
| Badge rejected | `--color-badge-rejected` | `bg-badge-rejected` |
| Badge waiting | `--color-badge-waiting` | `bg-badge-waiting` |
| Disabled opacity | `--opacity-disabled` | `opacity-disabled` |
| Font | `--font-sans` | `font-sans` |
| Page title | `--text-title` | `text-title` |
| Small title | `--text-title-sm` | `text-title-sm` |
| Body | `--text-body` | `text-body` |
| Field gap | `--spacing-field` | `gap-field` |
| Stack gap | `--spacing-stack` | `gap-stack` |
| Section | `--spacing-section` | `p-section` |
| Page | `--spacing-page` | `p-page` |

The palette follows the Behance dashboard reference: teal primary, navy sidebar, light-gray canvas, white cards, and green/amber/red status chips. Existing shared components retain compatibility aliases such as `--color-primary`, `--color-surface`, and `--color-danger`. Use `text-muted-foreground` for muted text; `text-muted` is now the light canvas colour.

## Rules

- No raw hex in a feature page if a token exists. Put a new value in `theme.css` instead.
- Every field has a visible label (use `TextField`, `Select`, `DateField`, or `FileSlot`).
- Do not add screens that are not on the route list.
- Empty and error banners use shared `Alert` and `EmptyState`.
- Focus rings use `--ring` (or its `--color-focus` alias) on `:focus-visible`. Do not set `outline: none` without a visible replacement.
- Disabled buttons and fields use `--opacity-disabled` and muted fill. Native `disabled` is enough; do not add new props.
- StatusBadge colours are `--color-badge-*`. Colour the chip, not the table row.
- App-shell chrome is Member 5.2. Public-card chrome (login, claim, invite-off, verify) is Member 5.3.
- Home, book leave, team queue, and company rules use these tokens (Member 5.5).

## Where hex is allowed

Only in `theme.css`. Shared component CSS and pages must use `var(--color-…)` or the matching utility.
