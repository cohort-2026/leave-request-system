import { useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  Alert,
  Button,
  DateField,
  FileSlot,
  Select,
} from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function NewLeavePage() {
  const navigate = useNavigate()

  return (
    <PageShell title="Book leave" eyebrow="Staff · manager · company admin">
      <p className="text-muted">
        One form for every company role. Managers do not review their own
        request. Working-day count will be stored on submit; remaining days do
        not move yet.
      </p>
      <Alert tone="info">Submit is not wired yet.</Alert>
      <form
        className="flex flex-col gap-stack"
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
        <p className="text-muted">
          Working days will show here before submit. Weekends and company
          holidays are excluded later.
        </p>
        <div className="flex flex-wrap gap-stack">
          <Button variant="primary" type="submit" disabled>
            Submit (wired later)
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(paths.leave)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
