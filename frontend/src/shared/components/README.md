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
