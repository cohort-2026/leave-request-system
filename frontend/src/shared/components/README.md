# Shared components (Member 4.1)

Plain controls with props and variants. No data fetching. No Tailwind tokens.

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
<Alert tone="error">Unknown staff number.</Alert>
```

## StatusBadge

Shape and status names only. Colours are Member 5.

```tsx
<StatusBadge status="pending" />
<StatusBadge status="approved" />
<StatusBadge status="rejected" />
<StatusBadge status="waiting" />
```
