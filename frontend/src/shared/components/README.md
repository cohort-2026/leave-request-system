# Shared components

Plain controls with props and variants. No data fetching. Colour, type, and spacing come from `../styles/theme.css`. Do not put raw hex on a page if a token exists.

## Button

```tsx
import { Button } from '../shared/components'

<Button variant="primary" type="submit">Sign in</Button>
<Button variant="secondary" onClick={onCancel}>Cancel</Button>
<Button variant="danger" disabled>Reject</Button>
```

## TextField

```tsx
<TextField label="Email" name="email" type="email" autoComplete="username" />
<TextField label="Password" name="password" type="password" error="Required" />
<TextField
  label="New password"
  name="newPassword"
  type="password"
  hint="Use at least 8 characters."
/>
```

## Select

```tsx
<Select label="Leave type" name="leaveType" defaultValue="">
  <option value="" disabled>
    Choose a type
  </option>
  <option>Annual</option>
</Select>
```

## DateField

```tsx
<DateField label="Start" name="start" />
<DateField label="End" name="end" />
```

## FileSlot

```tsx
<FileSlot label="Supporting file" name="attachment" />
<FileSlot label="Staff list" name="roster" accept=".csv" />
```

## Alert

```tsx
<Alert tone="info">Walkthrough buttons stand in for Express auth.</Alert>
<Alert tone="success">Your email is verified.</Alert>
<Alert tone="error">Unknown staff number.</Alert>
```

## StatusBadge

Chip colours come from `--color-badge-*` in `theme.css`. The class paints the
badge, not the table row.

```tsx
<StatusBadge status="pending" />
<StatusBadge status="approved" />
<StatusBadge status="rejected" />
<StatusBadge status="waiting" />
```

## PageHeader

Title plus one optional action. `PageShell` composes this; keep the eyebrow on the shell.

```tsx
<PageHeader title="My leave" action={<Button variant="primary">Book leave</Button>} />
```

## Nav

Role-aware links. `AppLayout` keeps brand and sign-out.

```tsx
<Nav role={session.role} />
```

## EmptyState

Used when a list has nothing to show.

```tsx
<EmptyState
  title="No leave requests"
  description="Book leave to see it here."
/>
```

## DataTable

Pass `columns` for a plain table, or `renderRow` for a list-row slot. Empty `data` renders `EmptyState`.

```tsx
<DataTable
  data={people}
  keyExtractor={(row) => row.id}
  columns={columns}
  emptyTitle="No people"
/>
```

## LeaveRequestRow

Same request cells for my leave and the team queue. Renders `<td>` cells for the `renderRow` slot.

```tsx
<LeaveRequestRow request={row} onView={(id) => navigate(`/leave/${id}`)} />
```

## CalendarGrid

One month table. Pages pass `year`, `month`, `view`, and marks. Holiday and blocked are different mark kinds, not different grids.

```tsx
<CalendarGrid
  year={2026}
  month={9}
  view="own"
  marks={[
    { date: '2026-09-01', kind: 'leave' },
    { date: '2026-09-24', kind: 'holiday', label: 'Heritage Day' },
    { date: '2026-09-15', kind: 'blocked', label: 'Stocktake' },
  ]}
/>
```

## Modal

Titled overlay. The page owns `open` and `onClose`. Reject reason stays on the review screen, not a new route. Native `dialog` traps focus.

```tsx
<Modal open={open} title="Reject reason" onClose={() => setOpen(false)}>
  <TextField label="Reason" name="rejectReason" />
  <Button variant="danger">Reject</Button>
</Modal>
```
