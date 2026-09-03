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
| Font | `--font-sans` | `font-sans` |
| Page title | `--text-title` | `text-title` |
| Small title | `--text-title-sm` | `text-title-sm` |
| Body | `--text-body` | `text-body` |
| Field gap | `--spacing-field` | `gap-field` |
| Stack gap | `--spacing-stack` | `gap-stack` |
| Section | `--spacing-section` | `p-section` |
| Page | `--spacing-page` | `p-page` |

Primary, text, muted, danger, and surface come from the wireframe ink / accent / paper colours so the product has one palette.

## Rules

- No raw hex in a feature page if a token exists. Put a new value in `theme.css` instead.
- Every field has a visible label (use `TextField`, `Select`, `DateField`, or `FileSlot`).
- Do not add screens that are not on the route list.
- Empty and error banners use shared `Alert` and `EmptyState`.
- Focus, disabled polish, and StatusBadge colours are Member 5.4. Leave those as extension points on this file.
- App-shell chrome is Member 5.2. Public-card chrome beyond login is Member 5.3. Remaining screens are Member 5.5.

## Where hex is allowed

Only in `theme.css`. Shared component CSS and pages must use `var(--color-…)` or the matching utility.
