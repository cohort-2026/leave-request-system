# Shared components (Member 4.1)

Plain controls with props and variants. No data fetching. No Tailwind tokens.

## Button

```tsx
import { Button } from '../shared/components'

<Button variant="primary" type="submit">Sign in</Button>
<Button variant="secondary" onClick={onCancel}>Cancel</Button>
<Button variant="danger" disabled>Reject</Button>
```
