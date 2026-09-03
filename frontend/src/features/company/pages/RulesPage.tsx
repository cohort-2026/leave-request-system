import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, Select } from '../../../shared/components'

export function RulesPage() {
  return (
    <PageShell title="Company rules" eyebrow="Company admin">
      <p className="text-muted">
        Approve-first defaults and who reviews a manager’s own leave. This is
        its own address, not a buried settings dump.
      </p>
      <Alert tone="info">Saving rules is not wired yet.</Alert>
      <form
        className="flex flex-col gap-stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <Select
          label="Staff leave is reviewed by"
          name="staffReviewer"
          defaultValue="manager"
        >
          <option value="manager">Manager</option>
        </Select>
        <Select
          label="A manager’s own leave is reviewed by"
          name="managerReviewer"
          defaultValue="company_admin"
        >
          <option value="company_admin">Company admin</option>
        </Select>
        <Button variant="primary" type="submit" disabled>
          Save (wired later)
        </Button>
      </form>
    </PageShell>
  )
}
