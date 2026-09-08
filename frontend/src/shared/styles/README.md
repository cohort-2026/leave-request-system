# Design tokens

Colour, type, and spacing live in `theme.css`. That file is the Tailwind theme.

## Tokens

| Token | CSS variable | Tailwind |
| --- | --- | --- |
| Primary | `--color-primary` | `bg-primary`, `text-primary` |
| Text | `--color-text` | `text-text`, `bg-text` |
| Muted | `--color-muted` | `text-muted` |
| Danger | `--color-danger` | `text-danger`, `bg-danger` |
| Surface | `--color-surface` | `bg-surface` |
| Focus | `--color-focus` | `outline-focus`, `ring-focus` |
| Success | `--color-success` | `text-success`, `bg-success` |
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

Primary, text, muted, danger, and surface come from the wireframe ink / accent / paper colours so the product has one palette. Focus, success, and badge chips come from the same wireframe (accent ring, ok, pending yellow, blocked grey).

## Rules

- No raw hex in a feature page if a token exists. Put a new value in `theme.css` instead.
- Every field has a visible label (use `TextField`, `Select`, `DateField`, or `FileSlot`).
- Do not add screens that are not on the route list.
- Empty and error banners use shared `Alert` and `EmptyState`.
- Focus rings use `--color-focus` on `:focus-visible`. Do not set `outline: none` without a visible replacement.
- Disabled buttons and fields use `--opacity-disabled` and muted fill. Native `disabled` is enough; do not add new props.
- StatusBadge colours are `--color-badge-*`. Colour the chip, not the table row.
- App-shell chrome is Member 5.2. Public-card chrome (login, claim, invite-off, verify) is Member 5.3.
- Home, book leave, team queue, and company rules use these tokens (Member 5.5).

## Where hex is allowed

Only in `theme.css`. Shared component CSS and pages must use `var(--color-…)` or the matching utility.
