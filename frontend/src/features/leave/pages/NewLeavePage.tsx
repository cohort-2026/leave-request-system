import { PageShell } from '../../../app/layouts/PageShell'

export function NewLeavePage() {
  return (
    <PageShell title="Book leave" eyebrow="Staff · manager · company admin">
      <p className="muted">
        One form for every company role. Managers do not review their own
        request. Working-day count will be stored on submit; remaining days do
        not move yet.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label>
          Leave type
          <select name="leaveType" defaultValue="">
            <option value="" disabled>
              Choose a type
            </option>
            <option>Annual</option>
            <option>Sick</option>
          </select>
        </label>
        <label>
          Start
          <input type="date" name="start" />
        </label>
        <label>
          End
          <input type="date" name="end" />
        </label>
        <button type="submit" disabled>
          Submit (wired later)
        </button>
      </form>
    </PageShell>
  )
}
