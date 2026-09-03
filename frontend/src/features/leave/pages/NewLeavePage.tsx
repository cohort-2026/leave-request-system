import { PageShell } from '../../../app/layouts/PageShell'
import {
  Alert,
  Button,
  DateField,
  FileSlot,
  Select,
} from '../../../shared/components'

export function NewLeavePage() {
  return (
    <PageShell title="Book leave" eyebrow="Staff · manager · company admin">
      <p className="muted">
        One form for every company role. Managers do not review their own
        request. Working-day count will be stored on submit; remaining days do
        not move yet.
      </p>
      <Alert tone="info">Submit is not wired yet.</Alert>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <Select label="Leave type" name="leaveType" defaultValue="">
          <option value="" disabled>
            Choose a type
          </option>
          <option>Annual</option>
          <option>Sick</option>
        </Select>
        <DateField label="Start" name="start" />
        <DateField label="End" name="end" />
        <FileSlot label="Supporting file" name="attachment" />
        <Button variant="primary" type="submit" disabled>
          Submit (wired later)
        </Button>
      </form>
    </PageShell>
  )
}
